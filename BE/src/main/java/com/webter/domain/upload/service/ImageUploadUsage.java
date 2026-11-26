package com.webter.domain.upload.service;

import com.webter.domain.upload.config.ImageStorageProperties;
import com.webter.domain.upload.exception.UploadErrorCode;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

/** 발급 비용 한도는 회원 행 잠금으로 검사한다. 정리는 신규 발급 이력이 있는 파일에만 적용한다. */
@lombok.extern.slf4j.Slf4j
@Service
public class ImageUploadUsage {

	private final JdbcClient jdbc;
	private final UserRepository users;
	private final TransactionTemplate tx;
	private final ObjectProvider<S3Client> clients;
	private final ImageStorageProperties storage;
	private final int countLimit;
	private final long byteLimit;
	private final int days;

	public ImageUploadUsage(JdbcClient jdbc, UserRepository users, TransactionTemplate tx,
			ObjectProvider<S3Client> clients, ImageStorageProperties storage,
			@Value("${app.image.daily-upload-limit:20}") int countLimit,
			@Value("${app.image.daily-upload-bytes:104857600}") long byteLimit,
			@Value("${app.image.unused-retention-days:7}") int days) {
		if (countLimit < 1 || byteLimit < 1 || days < 1) throw new IllegalArgumentException("Invalid image limits");
		this.jdbc = jdbc; this.users = users; this.tx = tx; this.clients = clients;
		this.storage = storage; this.countLimit = countLimit; this.byteLimit = byteLimit; this.days = days;
	}

	@Transactional
	public void reserve(UUID user, String key, String url, long size) {
		users.findLockedById(user).orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
		var start = LocalDate.now(ZoneId.of("Asia/Seoul")).atStartOfDay(ZoneId.of("Asia/Seoul")).toOffsetDateTime();
		boolean full = jdbc.sql("""
			SELECT count(*) >= :count OR coalesce(sum(size_bytes), 0) + :bytes > :max
			FROM image_upload_usage WHERE user_id = :user AND issued_at >= :start
			""").param("user", user).param("start", start).param("count", countLimit)
			.param("bytes", size).param("max", byteLimit).query(Boolean.class).single();
		if (full) throw new BusinessException(UploadErrorCode.UPLOAD_DAILY_LIMIT);
		jdbc.sql("""
			INSERT INTO image_upload_usage(object_key, user_id, image_url, size_bytes, retain_until)
			VALUES (:key, :user, :url, :size, now() + :days * interval '1 day')
			""").param("key", key).param("user", user).param("url", url).param("size", size).param("days", days).update();
	}

	/** 저장 직전에 유예를 갱신한다. 이미 정리에 들어간 주소의 재사용은 거절한다. */
	@Transactional
	public void retain(String url) {
		jdbc.sql("UPDATE image_upload_usage SET retain_until = now() + :days * interval '1 day', unused_since = NULL WHERE image_url = :url AND NOT deleting")
			.param("days", days).param("url", url).update();
		if (jdbc.sql("SELECT EXISTS(SELECT 1 FROM image_upload_usage WHERE image_url = :url AND deleting)")
			.param("url", url).query(Boolean.class).single()) throw new BusinessException(UploadErrorCode.UPLOAD_NOT_FOUND);
	}

	public void requireOwner(UUID user, String url) {
		if (!jdbc.sql("SELECT EXISTS(SELECT 1 FROM image_upload_usage WHERE user_id = :user AND image_url = :url AND NOT deleting)")
			.param("user", user).param("url", url).query(Boolean.class).single())
			throw new BusinessException(UploadErrorCode.UPLOAD_NOT_FOUND);
	}

	public void promoted(String url) {
		jdbc.sql("UPDATE image_upload_usage SET promoted_at = now() WHERE image_url = :url AND promoted_at IS NULL AND NOT deleting")
			.param("url", url).update();
	}

	// 초안의 이미지뿐 아니라 회고 본문에서 참조한 업로드 이미지도 보존한다.
	private static final String REFERENCED = """
		EXISTS(SELECT 1 FROM users p WHERE p.avatar_url = u.image_url)
		OR EXISTS(SELECT 1 FROM services s WHERE s.icon_url = u.image_url OR s.thumbnail_url = u.image_url
		  OR s.preview_images @> jsonb_build_array(u.image_url))
		OR EXISTS(SELECT 1 FROM service_registration_drafts d WHERE d.payload ->> 'iconImg' = u.image_url
		  OR d.payload ->> 'thumbImg' = u.image_url OR d.payload -> 'pv' @> jsonb_build_array(u.image_url))
		OR EXISTS(SELECT 1 FROM user_reflections r WHERE strpos(r.body, u.image_url) > 0)
		""";

	@Scheduled(fixedDelayString = "${app.image.cleanup-delay-ms:3600000}", initialDelayString = "${app.image.cleanup-delay-ms:3600000}")
	public void cleanup() {
		S3Client s3 = clients.getIfAvailable();
		if (s3 == null) return;
		// 공개 복사 후 남은 PUT 서명이 재사용돼도 격리 사본이 영구히 남지 않게 한다.
		// 서명 만료(5분)보다 늦게, 공개 검증이 끝난 파일의 pending 사본만 정리한다.
		var pending = jdbc.sql("SELECT object_key FROM image_upload_usage WHERE promoted_at IS NOT NULL AND NOT pending_pruned AND issued_at < now() - interval '10 minutes' LIMIT 100")
			.query(String.class).list();
		for (String key : pending) {
			try {
				s3.deleteObject(DeleteObjectRequest.builder().bucket(storage.bucket()).key(pendingKey(key)).build());
				jdbc.sql("UPDATE image_upload_usage SET pending_pruned = true WHERE object_key = :key").param("key", key).update();
			}
			catch (RuntimeException ex) { log.warn("이미지 정리 미완료: stage=pending, type={}", ex.getClass().getSimpleName()); break; }
		}
		List<String> keys = tx.execute(status -> {
			jdbc.sql("UPDATE image_upload_usage u SET unused_since = CASE WHEN (" + REFERENCED
				+ ") THEN NULL ELSE coalesce(unused_since, now()) END WHERE NOT deleting").update();
			List<String> candidates = jdbc.sql("SELECT object_key FROM image_upload_usage u WHERE deleting OR (retain_until < now() AND unused_since < now() - :days * interval '1 day' AND NOT ("
				+ REFERENCED + ")) ORDER BY retain_until LIMIT 100 FOR UPDATE SKIP LOCKED")
				.param("days", days).query(String.class).list();
			for (String key : candidates) jdbc.sql("UPDATE image_upload_usage SET deleting = true WHERE object_key = :key").param("key", key).update();
			return candidates;
		});
		for (String key : keys == null ? List.<String>of() : keys) {
			try {
				s3.deleteObject(DeleteObjectRequest.builder().bucket(storage.bucket()).key(pendingKey(key)).build());
				s3.deleteObject(DeleteObjectRequest.builder().bucket(storage.bucket()).key(key).build());
				jdbc.sql("DELETE FROM image_upload_usage WHERE object_key = :key AND deleting").param("key", key).update();
			}
			catch (RuntimeException ex) { log.warn("이미지 정리 미완료: stage=unused, type={}", ex.getClass().getSimpleName()); break; }
		}
	}

	static String pendingKey(String key) { return "pending/" + key.substring(ImageStorageProperties.KEY_PREFIX.length()); }
}

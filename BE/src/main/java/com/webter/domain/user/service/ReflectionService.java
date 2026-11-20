package com.webter.domain.user.service;

import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.exception.ErrorCode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회고는 항상 작성자 본인 범위로 조회한다. 공개·관리자 우회 경로를 제공하지 않는다. */
@Service
@RequiredArgsConstructor
public class ReflectionService {

	private final JdbcClient jdbc;

	public record Entry(UUID id, Long serviceId, String serviceName, String title, String body,
			UUID revision, Instant createdAt, Instant updatedAt) {
	}

	public record Summary(UUID id, Long serviceId, String serviceName, String title, String excerpt, Instant updatedAt) {
	}

	public record Page(List<Summary> items, int page, int size, long total) {
	}

	@Transactional(readOnly = true)
	public Page list(UUID userId, int page, int size, Long serviceId) {
		if (page < 0 || size < 1 || size > 100 || (serviceId != null && serviceId < 1)) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		String where = " WHERE user_id = :user" + (serviceId == null ? "" : " AND service_id = :service");
		var params = new java.util.HashMap<String, Object>();
		params.put("user", userId);
		if (serviceId != null) params.put("service", serviceId);
		long total = jdbc.sql("SELECT count(*) FROM user_reflections" + where).params(params).query(Long.class).single();
		params.put("size", size);
		params.put("offset", (long) page * size);
		List<Summary> items = jdbc.sql("""
				SELECT reflection_id, service_id, service_name, title, left(body, 160) AS excerpt, updated_at
				FROM user_reflections
				""" + where + " ORDER BY updated_at DESC, reflection_id LIMIT :size OFFSET :offset")
			.params(params).query((rs, i) -> new Summary(rs.getObject("reflection_id", UUID.class),
				rs.getObject("service_id", Long.class), rs.getString("service_name"), rs.getString("title"),
				rs.getString("excerpt"), rs.getObject("updated_at", OffsetDateTime.class).toInstant())).list();
		return new Page(items, page, size, total);
	}

	@Transactional(readOnly = true)
	public Entry get(UUID userId, UUID id) {
		return jdbc.sql("SELECT * FROM user_reflections WHERE reflection_id = :id AND user_id = :user")
			.param("id", id).param("user", userId).query(this::map).optional()
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
	}

	@Transactional
	public Entry create(UUID userId, long serviceId, String title, String body) {
		UUID id = UUID.randomUUID();
		int inserted = jdbc.sql("""
				INSERT INTO user_reflections(reflection_id, user_id, service_id, service_name, title, body, revision)
				SELECT :id, :user, service_id, name, :title, :body, :revision
				FROM services WHERE service_id = :service AND owner_id = :user
				""").param("id", id).param("user", userId).param("service", serviceId)
			.param("title", title.strip()).param("body", body).param("revision", UUID.randomUUID()).update();
		if (inserted == 0) throw new BusinessException(CommonErrorCode.NOT_FOUND);
		return get(userId, id);
	}

	@Transactional
	public Entry update(UUID userId, UUID id, UUID revision, Long serviceId, String title, String body) {
		Entry current = get(userId, id);
		String serviceName = current.serviceName();
		if (!Objects.equals(serviceId, current.serviceId())) {
			if (serviceId == null) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
			serviceName = jdbc.sql("SELECT name FROM services WHERE service_id = :id AND owner_id = :user")
				.param("id", serviceId).param("user", userId).query(String.class).optional()
				.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		}
		int changed = jdbc.sql("""
				UPDATE user_reflections SET service_id = :service, service_name = :name, title = :title,
				body = :body, revision = :next, updated_at = now()
				WHERE reflection_id = :id AND user_id = :user AND revision = :revision
				""").param("id", id).param("user", userId).param("revision", revision)
			.param("service", serviceId).param("name", serviceName).param("title", title.strip())
			.param("body", body).param("next", UUID.randomUUID()).update();
		if (changed == 0) throw new BusinessException(ReflectionError.CONFLICT);
		return get(userId, id);
	}

	@Transactional
	public void delete(UUID userId, UUID id, UUID revision) {
		get(userId, id);
		int deleted = jdbc.sql("DELETE FROM user_reflections WHERE reflection_id = :id AND user_id = :user AND revision = :revision")
			.param("id", id).param("user", userId).param("revision", revision).update();
		if (deleted == 0) throw new BusinessException(ReflectionError.CONFLICT);
	}

	private Entry map(ResultSet rs, int row) throws SQLException {
		return new Entry(rs.getObject("reflection_id", UUID.class), rs.getObject("service_id", Long.class),
			rs.getString("service_name"), rs.getString("title"), rs.getString("body"), rs.getObject("revision", UUID.class),
			rs.getObject("created_at", OffsetDateTime.class).toInstant(), rs.getObject("updated_at", OffsetDateTime.class).toInstant());
	}

	private enum ReflectionError implements ErrorCode {
		CONFLICT;
		public HttpStatus getStatus() { return HttpStatus.CONFLICT; }
		public String getCode() { return "REFLECTION_409_01"; }
		public String getMessage() { return "다른 화면에서 회고가 변경됐어요. 다시 불러온 뒤 수정해 주세요."; }
	}

}

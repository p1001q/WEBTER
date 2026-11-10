package com.webter.domain.upload.service;

import com.webter.domain.upload.config.ImageStorageProperties;
import com.webter.domain.upload.dto.UploadRequest;
import com.webter.domain.upload.dto.UploadResponse;
import com.webter.domain.upload.exception.UploadErrorCode;
import com.webter.global.exception.BusinessException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * 브라우저가 이미지를 저장소에 직접 올릴 수 있는 일회용 주소를 발급한다(정책서 4.4). 형식(JPG·PNG·WebP)과 크기(5MB 이하)는
 * 주소를 만들 때 정하고 서명에 포함하므로 다른 형식·크기로는 올릴 수 없다. 실제 이미지인지는 올린 뒤 {@link ImageVerifier}가 확인한다.
 */
@Service
public class ImageUploadService {

	public static final long MAX_BYTES = 5L * 1024 * 1024;

	static final Duration EXPIRES = Duration.ofMinutes(5);

	private static final Map<String, String> EXTENSIONS = Map.of("image/jpeg", "jpg", "image/png", "png",
			"image/webp", "webp");

	private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

	private final ImageStorageProperties properties;

	private final ObjectProvider<S3Presigner> presigner;

	public ImageUploadService(ImageStorageProperties properties, ObjectProvider<S3Presigner> presigner) {
		this.properties = properties;
		this.presigner = presigner;
	}

	public UploadResponse issue(UploadRequest request) {
		S3Presigner signer = presigner.getIfAvailable();
		if (!properties.enabled() || signer == null) {
			throw new BusinessException(UploadErrorCode.UPLOAD_DISABLED);
		}
		String contentType = request.contentType().trim().toLowerCase();
		String extension = EXTENSIONS.get(contentType);
		if (extension == null) {
			throw new BusinessException(UploadErrorCode.UPLOAD_UNSUPPORTED_TYPE);
		}
		long size = request.size();
		if (size <= 0 || size > MAX_BYTES) {
			throw new BusinessException(UploadErrorCode.UPLOAD_TOO_LARGE);
		}
		// 추측할 수 없는 이름으로 두고(예측 가능한 번호를 쓰지 않는다) 날짜별로 나눈다
		LocalDate today = LocalDate.now(ZONE);
		String key = "%s%d/%02d/%s.%s".formatted(ImageStorageProperties.KEY_PREFIX, today.getYear(),
				today.getMonthValue(), UUID.randomUUID(), extension);
		var signed = signer.presignPutObject(PutObjectPresignRequest.builder()
			.signatureDuration(EXPIRES)
			.putObjectRequest(PutObjectRequest.builder()
				.bucket(properties.bucket())
				.key(key)
				.contentType(contentType)
				.contentLength(size)
				.build())
			.build());
		Map<String, String> headers = new LinkedHashMap<>();
		headers.put("Content-Type", contentType);
		return new UploadResponse(signed.url().toString(), "PUT", headers, properties.baseUrl() + "/" + key,
				Instant.now().plus(EXPIRES));
	}

}

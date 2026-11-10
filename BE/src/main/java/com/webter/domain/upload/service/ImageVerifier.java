package com.webter.domain.upload.service;

import com.webter.domain.upload.config.ImageStorageProperties;
import com.webter.domain.upload.exception.UploadErrorCode;
import com.webter.global.exception.BusinessException;
import java.io.IOException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * 서비스에 연결하려는 이미지 주소가 이 서버가 올린 이미지인지, 저장소에 실제로 있는지, 크기와 파일 내용(매직 바이트)이
 * JPG·PNG·WebP인지 확인한다. 이미지 업로드가 꺼져 있으면(bucket 없음) 이 서버가 올린 이미지가 없다고 본다.
 */
@Component
public class ImageVerifier {

	private final ImageStorageProperties properties;

	private final ObjectProvider<S3Client> client;

	public ImageVerifier(ImageStorageProperties properties, ObjectProvider<S3Client> client) {
		this.properties = properties;
		this.client = client;
	}

	/** 이 서버가 올린 이미지의 주소(설정한 이미지 주소 앞부분 + 업로드 경로)인지 */
	public boolean isOwnUrl(String url) {
		return keyOf(url) != null;
	}

	/** 검증에 실패하면 BusinessException을 던진다. */
	public void verify(String url) {
		String key = keyOf(url);
		S3Client s3 = client.getIfAvailable();
		if (key == null || s3 == null) {
			throw new BusinessException(UploadErrorCode.UPLOAD_NOT_FOUND);
		}
		try {
			long length = s3.headObject(HeadObjectRequest.builder().bucket(properties.bucket()).key(key).build())
				.contentLength();
			if (length <= 0 || length > ImageUploadService.MAX_BYTES) {
				throw new BusinessException(UploadErrorCode.UPLOAD_TOO_LARGE);
			}
			byte[] head = s3.getObject(GetObjectRequest.builder()
				.bucket(properties.bucket())
				.key(key)
				.range("bytes=0-15")
				.build(), ResponseTransformer.toBytes()).asByteArray();
			if (!looksLikeImage(head)) {
				throw new BusinessException(UploadErrorCode.UPLOAD_NOT_AN_IMAGE);
			}
		}
		catch (NoSuchKeyException ex) {
			throw new BusinessException(UploadErrorCode.UPLOAD_NOT_FOUND);
		}
		catch (S3Exception ex) {
			// 없는 객체의 HEAD는 404, 그 밖의 저장소 오류는 확인하지 못한 것으로 거절한다
			throw new BusinessException(UploadErrorCode.UPLOAD_NOT_FOUND);
		}
	}

	/** 업로드 주소에서 저장소 키를 꺼낸다. 이 서버가 올린 이미지가 아니면 null이다. */
	String keyOf(String url) {
		String base = properties.baseUrl();
		if (url == null || base.isEmpty() || !url.startsWith(base + "/")) {
			return null;
		}
		String key = url.substring(base.length() + 1);
		boolean safe = key.startsWith(ImageStorageProperties.KEY_PREFIX) && !key.contains("..") && !key.contains("\\")
				&& !key.contains("?") && !key.contains("#") && !key.contains("%") && key.length() <= 200;
		return safe ? key : null;
	}

	/** JPEG(FF D8 FF), PNG(89 50 4E 47 0D 0A 1A 0A), WebP(RIFF....WEBP) */
	static boolean looksLikeImage(byte[] b) throws RuntimeException {
		if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
			return true;
		}
		byte[] png = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
		if (b.length >= 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(b, 8), png)) {
			return true;
		}
		return b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W'
				&& b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
	}

}

package com.webter.domain.upload.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 이미지 저장소(S3) 설정(app.image). bucket이 비어 있으면 이미지 업로드는 꺼진 상태다.
 * endpoint·publicEndpoint는 로컬(MinIO)처럼 AWS가 아닌 S3 호환 저장소를 쓸 때만 지정한다.
 * accessKey·secretKey는 로컬·테스트 전용이며 운영은 환경의 자격증명(AWS 기본 자격증명 체인)을 쓴다.
 */
@ConfigurationProperties("app.image")
public record ImageStorageProperties(String bucket, String region, String endpoint, String publicEndpoint,
		String publicBaseUrl, String accessKey, String secretKey) {

	/** 업로드한 이미지를 두는 경로 접두어 */
	public static final String KEY_PREFIX = "uploads/";

	public boolean enabled() {
		return bucket != null && !bucket.isBlank();
	}

	/** 이미지 주소의 앞부분(끝의 / 제외). 이 주소로 시작하는 주소만 이 서버가 올린 이미지로 본다. */
	public String baseUrl() {
		String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
		return base.replaceAll("/+$", "");
	}

	// 비밀값이 로그에 남지 않게 한다
	@Override
	public String toString() {
		return "ImageStorageProperties[bucket=" + bucket + ", region=" + region + ", endpoint=" + endpoint
				+ ", publicBaseUrl=" + publicBaseUrl + "]";
	}

}

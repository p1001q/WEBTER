package com.webter.domain.upload.dto;

import java.time.Instant;
import java.util.Map;

/**
 * 업로드 주소 발급 결과. 브라우저는 uploadUrl로 method(PUT) 요청을 headers와 함께 파일 본문을 보내 올리고,
 * 서비스 등록·수정에는 imageUrl을 보낸다.
 */
public record UploadResponse(String uploadUrl, String method, Map<String, String> headers, String imageUrl,
		Instant expiresAt) {

}

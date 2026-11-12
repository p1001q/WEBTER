package com.webter.domain.upload.controller;

import com.webter.domain.upload.dto.UploadRequest;
import com.webter.domain.upload.dto.UploadResponse;
import com.webter.domain.upload.service.ImageUploadService;
import com.webter.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 이미지 업로드 주소 발급. 가입을 완료한 회원만 쓸 수 있고 CSRF 토큰이 필요하다(SecurityConfig의 기본 규칙). */
@RestController
@RequestMapping("/api/uploads/images")
@RequiredArgsConstructor
public class ImageUploadController {

	private final ImageUploadService uploads;

	@PostMapping
	public ApiResponse<UploadResponse> issue(@Valid @RequestBody UploadRequest body) {
		return ApiResponse.ok(uploads.issue(body));
	}

}

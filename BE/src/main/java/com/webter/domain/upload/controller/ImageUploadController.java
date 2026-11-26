package com.webter.domain.upload.controller;

import com.webter.domain.upload.dto.UploadRequest;
import com.webter.domain.upload.dto.UploadResponse;
import com.webter.domain.upload.service.ImageUploadService;
import com.webter.domain.upload.service.ImageUploadUsage;
import com.webter.domain.upload.service.ImageVerifier;
import com.webter.global.security.SessionPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
	private final ImageUploadUsage usage;
	private final ImageVerifier verifier;

	@PostMapping
	public ApiResponse<UploadResponse> issue(@AuthenticationPrincipal SessionPrincipal.Member member, @Valid @RequestBody UploadRequest body) {
		return ApiResponse.ok(uploads.issue(member.userId(), body));
	}

	public record Complete(@NotBlank @Size(max = 2048) String imageUrl) { }

	@PostMapping("/complete")
	public ApiResponse<Void> complete(@AuthenticationPrincipal SessionPrincipal.Member member, @Valid @RequestBody Complete body) {
		usage.requireOwner(member.userId(), body.imageUrl());
		verifier.verify(body.imageUrl());
		return ApiResponse.ok();
	}

}

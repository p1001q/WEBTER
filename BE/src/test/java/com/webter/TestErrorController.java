package com.webter;

import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// 공통 오류 응답을 검증하기 위한 테스트 전용 엔드포인트(운영 코드에는 포함되지 않는다)
@RestController
class TestErrorController {

	record NameRequest(@NotBlank String name) {
	}

	@GetMapping("/test/ok")
	ApiResponse<String> ok() {
		return ApiResponse.ok("pong");
	}

	@GetMapping("/test/business")
	void business() {
		throw new BusinessException(CommonErrorCode.NOT_FOUND);
	}

	@GetMapping("/test/boom")
	void boom() {
		throw new IllegalStateException("내부 비밀 정보");
	}

	@PostMapping("/test/validate")
	ApiResponse<Void> validate(@Valid @RequestBody NameRequest request) {
		return ApiResponse.ok();
	}

}

package com.webter.global.response;

import com.webter.global.exception.ErrorCode;

/** 모든 API의 공통 응답 형식. 실패하면 data는 null이고 code로 원인을 구분한다. */
public record ApiResponse<T>(boolean success, String code, String message, T data) {

	public static <T> ApiResponse<T> ok(T data) {
		return new ApiResponse<>(true, "COMMON_200", "요청에 성공했습니다.", data);
	}

	public static ApiResponse<Void> ok() {
		return new ApiResponse<>(true, "COMMON_200", "요청에 성공했습니다.", null);
	}

	public static ApiResponse<Void> fail(ErrorCode errorCode) {
		return new ApiResponse<>(false, errorCode.getCode(), errorCode.getMessage(), null);
	}

	// 입력 검증 실패처럼 필드별 상세를 data에 담을 때 쓴다
	public static <T> ApiResponse<T> fail(ErrorCode errorCode, T data) {
		return new ApiResponse<>(false, errorCode.getCode(), errorCode.getMessage(), data);
	}

}

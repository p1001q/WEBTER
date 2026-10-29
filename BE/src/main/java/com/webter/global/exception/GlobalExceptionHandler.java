package com.webter.global.exception;

import com.webter.global.response.ApiResponse;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 모든 예외를 ApiResponse 형식의 오류 응답으로 바꾼다.
 * 본문 파싱 실패·405 같은 표준 MVC 예외는 ResponseEntityExceptionHandler가 상태를 정하고, 여기서 본문만 공통 형식으로 감싼다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(BusinessException.class)
	ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e) {
		ErrorCode errorCode = e.getErrorCode();
		log.warn("업무 예외: {}", errorCode.getCode());
		return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.fail(errorCode));
	}

	// 예상하지 못한 예외. 내부 내용은 응답에 담지 않고 로그에만 남긴다.
	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
		log.error("처리되지 않은 예외", e);
		ErrorCode errorCode = CommonErrorCode.INTERNAL_SERVER_ERROR;
		return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.fail(errorCode));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();
		e.getBindingResult().getFieldErrors()
			.forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
		ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;
		return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.fail(errorCode, fieldErrors));
	}

	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		ErrorCode errorCode = Arrays.stream(CommonErrorCode.values())
			.filter(code -> code.getStatus().value() == status.value())
			.findFirst()
			.orElse(status.is5xxServerError() ? CommonErrorCode.INTERNAL_SERVER_ERROR
					: CommonErrorCode.INVALID_INPUT_VALUE);
		return ResponseEntity.status(status).headers(headers).body(ApiResponse.fail(errorCode));
	}

}

package com.webter.domain.webservice.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ServiceErrorCode implements ErrorCode {

	SERVICE_NOT_FOUND(HttpStatus.NOT_FOUND, "SERVICE_404_01", "서비스를 찾을 수 없습니다."),
	INVALID_SORT(HttpStatus.BAD_REQUEST, "SERVICE_400_01", "정렬 조건이 올바르지 않습니다. 관련도순은 검색어가 필요합니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

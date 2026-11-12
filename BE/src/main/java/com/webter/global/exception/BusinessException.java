package com.webter.global.exception;

import lombok.Getter;

/** 업무 규칙 위반을 알리는 예외. GlobalExceptionHandler가 ErrorCode에 맞는 오류 응답으로 바꾼다. */
@Getter
public class BusinessException extends RuntimeException {

	private final ErrorCode errorCode;

	public BusinessException(ErrorCode errorCode) {
		super(errorCode.getMessage());
		this.errorCode = errorCode;
	}

}

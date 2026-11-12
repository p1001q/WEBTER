package com.webter.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 오류 응답에 쓰는 코드. 공통 코드는 CommonErrorCode, 기능별 코드는 각 기능 패키지의 exception 패키지에 둔다.
 * 코드 문자열은 {기능}_{HTTP 상태}_{번호} 형식이다(예: COMMON_404_01, USER_409_01).
 */
public interface ErrorCode {

	HttpStatus getStatus();

	String getCode();

	String getMessage();

}

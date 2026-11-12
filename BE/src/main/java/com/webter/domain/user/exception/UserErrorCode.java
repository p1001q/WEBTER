package com.webter.domain.user.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {

	CONSENT_REQUIRED(HttpStatus.BAD_REQUEST, "USER_400_01", "필수 약관에 모두 동의해 주세요."),
	INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "USER_400_02", "선택할 수 없는 카테고리가 포함되어 있습니다."),
	INVALID_LINK(HttpStatus.BAD_REQUEST, "USER_400_03", "외부 링크 주소 또는 종류가 올바르지 않습니다."),
	USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_404_01", "사용자를 찾을 수 없습니다."),
	USERNAME_DUPLICATED(HttpStatus.CONFLICT, "USER_409_01", "이미 사용 중인 아이디입니다."),
	ALREADY_REGISTERED(HttpStatus.CONFLICT, "USER_409_02", "이미 가입된 계정입니다."),
	POLICY_VERSION_CHANGED(HttpStatus.CONFLICT, "USER_409_03", "약관이 변경되었습니다. 최신 내용을 확인한 뒤 다시 동의해 주세요.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

package com.webter.domain.user.dto;

/** 아이디 형식(정책서 2.1). 프론트의 입력 검사(domain/validation.ts)와 같은 규칙이다. 닉네임은 {@link ValidNickname}. */
public final class UserPatterns {

	/** 3~30자, 영문·숫자·마침표·밑줄. 마침표로 시작·끝 불가, 연속 불가, 영문·숫자 최소 한 글자 */
	public static final String USERNAME = "^(?!\\.)(?!.*\\.\\.)(?!.*\\.$)(?=.*[A-Za-z0-9])[A-Za-z0-9._]{3,30}$";

	private UserPatterns() {
	}

}

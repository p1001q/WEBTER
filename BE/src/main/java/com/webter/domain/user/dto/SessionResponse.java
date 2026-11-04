package com.webter.domain.user.dto;

/**
 * 현재 로그인 상태. ANONYMOUS(로그인 안 함), SIGNUP_PENDING(구글 인증만 마침, 온보딩 필요), MEMBER(가입 완료).
 * 상태에 해당하지 않는 필드는 null이다.
 */
public record SessionResponse(Status status, PendingResponse pending, MemberResponse member) {

	public enum Status {
		ANONYMOUS, SIGNUP_PENDING, MEMBER
	}

	/** 온보딩 중인 사용자의 구글 계정 이메일(본인 세션에만 내려간다) */
	public record PendingResponse(String email) {
	}

	public static SessionResponse anonymous() {
		return new SessionResponse(Status.ANONYMOUS, null, null);
	}

	public static SessionResponse signupPending(String email) {
		return new SessionResponse(Status.SIGNUP_PENDING, new PendingResponse(email), null);
	}

	public static SessionResponse member(MemberResponse member) {
		return new SessionResponse(Status.MEMBER, null, member);
	}

}

package com.webter.global.security;

import java.io.Serializable;
import java.util.UUID;

/**
 * 세션에 보관하는 로그인 주체. 구글 토큰은 보관하지 않는다.
 * 구글 인증만 마친 사용자는 PendingSignup(회원 정보 없음), 가입을 완료한 회원은 Member다.
 */
public sealed interface SessionPrincipal extends Serializable {

	String ROLE_SIGNUP_PENDING = "SIGNUP_PENDING";

	/** 가입을 완료한 회원. 권한(USER·ADMIN)은 로그인·가입 완료 시점의 값이다. */
	record Member(UUID userId) implements SessionPrincipal {
	}

	/** 구글 인증은 끝났지만 온보딩 최종 제출 전인 사용자. 이 상태에서는 회원 정보가 DB에 없다. */
	record PendingSignup(String googleSubject, String email) implements SessionPrincipal {

		// 구글 식별자와 이메일이 로그에 남지 않게 한다
		@Override
		public String toString() {
			return "PendingSignup[redacted]";
		}

	}

}

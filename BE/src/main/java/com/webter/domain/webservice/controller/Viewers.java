package com.webter.domain.webservice.controller;

import com.webter.domain.user.entity.UserRole;
import com.webter.domain.webservice.service.ServiceQueryService.Viewer;
import com.webter.global.security.SessionPrincipal;
import org.springframework.security.core.Authentication;

/** 인증 정보에서 조회·관리하는 사람(Viewer)을 만든다. 비로그인이면 null이다. */
final class Viewers {

	private Viewers() {
	}

	static Viewer of(Authentication authentication) {
		if (authentication != null && authentication.getPrincipal() instanceof SessionPrincipal.Member member) {
			boolean admin = authentication.getAuthorities()
				.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_" + UserRole.ADMIN.name()));
			return new Viewer(member.userId(), admin);
		}
		return null;
	}

	/** 변경 요청은 가입을 완료한 회원만 보낸다(SecurityConfig). 그래도 확인해 둔다. */
	static Viewer require(Authentication authentication) {
		Viewer viewer = of(authentication);
		if (viewer == null) {
			throw new com.webter.global.exception.BusinessException(
					com.webter.global.exception.CommonErrorCode.UNAUTHORIZED);
		}
		return viewer;
	}

}

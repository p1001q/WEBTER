package com.webter.global.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/** 로그인 주체를 세션에 올린다. 권한이 바뀌는 시점(로그인, 가입 완료)마다 세션 ID를 새로 발급한다. */
@Component
@RequiredArgsConstructor
public class SessionAuthenticator {

	private final SecurityContextRepository contexts;

	public void establish(HttpServletRequest request, HttpServletResponse response, SessionPrincipal principal,
			String role) {
		if (request.getSession(false) != null) {
			request.changeSessionId();
		}
		var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null,
				List.of(new SimpleGrantedAuthority("ROLE_" + role)));
		var context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		contexts.saveContext(context, request, response);
	}

}

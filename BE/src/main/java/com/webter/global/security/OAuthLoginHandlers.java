package com.webter.global.security;

import com.webter.domain.user.entity.User;
import com.webter.domain.user.service.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * 구글 인증 직후의 분기. 이미 가입한 회원이면 로그인 상태로 보던 페이지로, 신규 사용자면 회원 정보를 만들지 않고
 * 가입 대기 상태로 온보딩 화면으로 보낸다(구글 인증만으로 가입 완료 처리하지 않는다).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthLoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

	private final MemberService members;

	private final AuthProperties properties;

	private final SessionAuthenticator sessions;

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException {
		String returnTo = takeReturnPath(request);
		try {
			if (!(authentication instanceof OAuth2AuthenticationToken token)
					|| !"google".equals(token.getAuthorizedClientRegistrationId())
					|| !(token.getPrincipal() instanceof OidcUser identity)) {
				throw new OAuth2AuthenticationException("invalid_google_identity");
			}
			String subject = identity.getSubject();
			String email = identity.getEmail();
			// 검증된 이메일만 받는다. 식별자는 sub이며 이메일은 식별자로 쓰지 않는다.
			if (!Boolean.TRUE.equals(identity.getEmailVerified()) || subject == null || subject.isBlank()
					|| subject.length() > 255 || email == null || email.isBlank() || email.length() > 320) {
				throw new OAuth2AuthenticationException("invalid_google_identity");
			}
			var member = members.findByGoogleSubject(subject);
			if (member.isPresent()) {
				User user = member.get();
				sessions.establish(request, response, new SessionPrincipal.Member(user.getId()), user.getRole().name());
				response.sendRedirect(properties.frontendOrigin() + returnTo);
			}
			else {
				sessions.establish(request, response, new SessionPrincipal.PendingSignup(subject, email),
						SessionPrincipal.ROLE_SIGNUP_PENDING);
				response.sendRedirect(properties.frontendOrigin() + "/onboarding" + backQuery(returnTo));
			}
		}
		catch (OAuth2AuthenticationException | DataAccessException ex) {
			// 예외와 원문 응답에는 개인정보·토큰이 있을 수 있어 내용을 남기지 않는다
			log.warn("구글 로그인 처리 실패: {}", ex.getClass().getSimpleName());
			fail(request, response, "failed", returnTo);
		}
	}

	@Override
	public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException exception) throws IOException {
		String code = exception instanceof OAuth2AuthenticationException oauth
				&& "access_denied".equals(oauth.getError().getErrorCode()) ? "cancelled" : "failed";
		fail(request, response, code, takeReturnPath(request));
	}

	private void fail(HttpServletRequest request, HttpServletResponse response, String code, String returnTo)
			throws IOException {
		SecurityContextHolder.clearContext();
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		response.sendRedirect(properties.frontendOrigin() + "/login?error=" + code
				+ ("/".equals(returnTo) ? "" : "&back=" + URLEncoder.encode(returnTo, StandardCharsets.UTF_8)));
	}

	private static String backQuery(String returnTo) {
		return "/".equals(returnTo) ? "" : "?back=" + URLEncoder.encode(returnTo, StandardCharsets.UTF_8);
	}

	// 로그인을 시작할 때 세션에 저장해 둔 돌아갈 경로를 꺼낸다. 없거나 잘못된 값이면 "/"
	private static String takeReturnPath(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session == null) {
			return "/";
		}
		Object stored = session.getAttribute(ReturnPath.SESSION_ATTRIBUTE);
		session.removeAttribute(ReturnPath.SESSION_ATTRIBUTE);
		try {
			return ReturnPath.validate(stored instanceof String path ? path : null);
		}
		catch (IllegalArgumentException ex) {
			return "/";
		}
	}

}

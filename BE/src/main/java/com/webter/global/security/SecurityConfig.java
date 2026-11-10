package com.webter.global.security;

import com.webter.global.exception.CommonErrorCode;
import com.webter.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;

/**
 * 구글 로그인(OIDC) + 서버 세션 쿠키 인증. 로그인 후에는 구글 토큰을 쓰지 않으므로 보관하지 않는다.
 * CORS는 CorsConfig(MVC)의 설정을 그대로 쓰고, 상태를 바꾸는 요청은 CSRF 토큰(GET /api/auth/csrf)을 요구한다.
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	ClientRegistrationRepository clientRegistrationRepository(AuthProperties properties) {
		ClientRegistration google = properties.googleEnabled()
				? CommonOAuth2Provider.GOOGLE.getBuilder("google")
					.clientId(properties.googleClientId())
					.clientSecret(properties.googleClientSecret())
					.scope("openid", "email")
					.redirectUri(properties.backendOrigin() + "/login/oauth2/code/google")
					.build()
				: null;
		return registrationId -> "google".equals(registrationId) ? google : null;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, OAuthLoginHandlers handlers,
			SecurityContextRepository contexts, ClientRegistrationRepository registrations) throws Exception {
		http.cors(Customizer.withDefaults())
			.csrf(Customizer.withDefaults())
			.securityContext(context -> context.securityContextRepository(contexts))
			.requestCache(cache -> cache.requestCache(new NullRequestCache()))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/health", "/health/**", "/error", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
				.permitAll()
				.requestMatchers(HttpMethod.GET, "/api/auth/csrf", "/api/auth/session", "/api/auth/login/google",
						"/api/policies/current", "/api/categories", "/api/services/**", "/oauth2/authorization/google",
						"/login/oauth2/code/google")
				.permitAll()
				.requestMatchers(HttpMethod.POST, "/api/services/*/reviews/guest").anonymous()
				.requestMatchers("/api/auth/signup", "/api/auth/username-available")
				.hasRole(SessionPrincipal.ROLE_SIGNUP_PENDING)
				// 그 밖의 API는 가입을 완료한 회원만 쓴다. 가입 대기 상태는 회원 권한이 없다.
				.anyRequest()
				.hasAnyRole("USER", "ADMIN"))
			.exceptionHandling(errors -> errors
				.authenticationEntryPoint((request, response, ex) -> writeError(response, CommonErrorCode.UNAUTHORIZED))
				.accessDeniedHandler((request, response, ex) -> writeError(response, CommonErrorCode.FORBIDDEN)))
			.oauth2Login(oauth -> oauth.clientRegistrationRepository(registrations)
				.authorizedClientRepository(discardAuthorizedClients())
				.successHandler(handlers)
				.failureHandler(handlers))
			.logout(logout -> logout.logoutUrl("/api/auth/logout")
				.invalidateHttpSession(true)
				.clearAuthentication(true)
				.deleteCookies("WEBTER_SESSION")
				.logoutSuccessHandler((request, response, authentication) -> {
					response.setStatus(HttpServletResponse.SC_OK);
					response.setContentType(MediaType.APPLICATION_JSON_VALUE);
					response.setCharacterEncoding(StandardCharsets.UTF_8.name());
					response.getWriter().write("{\"success\":true,\"code\":\"COMMON_200\",\"message\":\"요청에 성공했습니다.\",\"data\":null}");
				}));
		return http.build();
	}

	// 구글 API 호출이나 refresh token은 쓰지 않으므로 토큰을 세션·DB·메모리 어디에도 보관하지 않는다.
	private static OAuth2AuthorizedClientRepository discardAuthorizedClients() {
		return new OAuth2AuthorizedClientRepository() {
			@Override
			public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String registrationId,
					Authentication principal, HttpServletRequest request) {
				return null;
			}

			@Override
			public void saveAuthorizedClient(OAuth2AuthorizedClient client, Authentication principal,
					HttpServletRequest request, HttpServletResponse response) {
			}

			@Override
			public void removeAuthorizedClient(String registrationId, Authentication principal,
					HttpServletRequest request, HttpServletResponse response) {
			}
		};
	}

	// 필터 단계의 오류도 ApiResponse와 같은 형식으로 내려 준다
	private static void writeError(HttpServletResponse response, ErrorCode errorCode) throws IOException {
		response.setStatus(errorCode.getStatus().value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter()
			.write("{\"success\":false,\"code\":\"" + errorCode.getCode() + "\",\"message\":\"" + errorCode.getMessage()
					+ "\",\"data\":null}");
	}

}

package com.webter.global.security;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 로그인 설정(app.auth). 구글 클라이언트 ID·시크릿은 둘 다 있을 때만 구글 로그인이 켜진다. */
@ConfigurationProperties("app.auth")
public record AuthProperties(String frontendOrigin, String backendOrigin, String googleClientId,
		String googleClientSecret) {

	public AuthProperties {
		validateOrigin(frontendOrigin);
		validateOrigin(backendOrigin);
		if (hasText(googleClientId) != hasText(googleClientSecret)) {
			throw new IllegalArgumentException("Google OAuth 클라이언트 ID와 시크릿은 함께 설정해야 합니다.");
		}
	}

	public boolean googleEnabled() {
		return hasText(googleClientId) && hasText(googleClientSecret);
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	// 스킴+호스트+포트만 허용한다. 루프백 주소가 아니면 HTTPS여야 한다.
	private static void validateOrigin(String value) {
		URI uri = URI.create(value);
		boolean loopbackHttp = "http".equals(uri.getScheme())
				&& ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
		boolean valid = (loopbackHttp || "https".equals(uri.getScheme())) && uri.getHost() != null
				&& uri.getRawUserInfo() == null && uri.getRawQuery() == null && uri.getRawFragment() == null
				&& (uri.getRawPath() == null || uri.getRawPath().isEmpty());
		if (!valid) {
			throw new IllegalArgumentException("인증 origin은 HTTPS origin이어야 합니다(로컬은 HTTP 루프백 허용): " + value);
		}
	}

	// 기본 record 출력으로 비밀값이 로그에 남지 않게 한다.
	@Override
	public String toString() {
		return "AuthProperties[frontendOrigin=" + frontendOrigin + ", backendOrigin=" + backendOrigin
				+ ", googleEnabled=" + googleEnabled() + "]";
	}

}

package com.webter.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 프론트엔드(다른 도메인)가 API를 호출할 수 있도록 허용할 도메인을 설정한다.
 * 허용 도메인은 환경변수 CORS_ALLOWED_ORIGINS(쉼표로 구분)로 받고, 비어 있으면 다른 도메인의 호출을 모두 막는다.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private final String[] allowedOrigins;

	public CorsConfig(@Value("${app.cors.allowed-origins:}") String[] allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		if (allowedOrigins.length == 0) {
			return;
		}
		registry.addMapping("/**")
			.allowedOrigins(allowedOrigins)
			.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
			.allowedHeaders("*")
			.allowCredentials(true)
			.maxAge(3600);
	}

}

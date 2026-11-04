package com.webter;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

// 테스트 전용 엔드포인트(/test/**)는 로그인 없이 열어 둔다. 운영 보안 설정에는 영향을 주지 않는다.
@TestConfiguration(proxyBeanMethods = false)
class TestSecurityConfiguration {

	@Bean
	@Order(0)
	SecurityFilterChain testEndpointsFilterChain(HttpSecurity http) throws Exception {
		http.securityMatcher("/test/**")
			.cors(Customizer.withDefaults())
			.csrf(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
		return http.build();
	}

}

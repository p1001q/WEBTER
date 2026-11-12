package com.webter.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** API 문서(Swagger UI) 정보. 문서 화면은 local 프로파일에서만 켜진다(application-local.yaml). */
@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI openApi() {
		return new OpenAPI().info(new Info().title("WEBTER API").version("v1"));
	}

}

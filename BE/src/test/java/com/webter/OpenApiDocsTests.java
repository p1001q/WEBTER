package com.webter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

// 기본 설정(운영)에서는 API 문서가 꺼져 있고, 켰을 때 springdoc이 Spring Boot 버전과 맞게 동작하는지 확인한다
@TestPropertySource(properties = "springdoc.api-docs.enabled=true")
class OpenApiDocsTests extends IntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void apiDocsAreServedWhenEnabled() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.info.title").value("WEBTER API"));
	}

}

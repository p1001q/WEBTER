package com.webter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

// test 프로파일의 허용 도메인은 http://localhost:3000 이다(application-test.yaml)
class CorsTests extends IntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void allowedOriginPassesPreflight() throws Exception {
		mockMvc.perform(options("/test/ping")
				.header("Origin", "http://localhost:3000")
				.header("Access-Control-Request-Method", "GET"))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
			.andExpect(header().string("Access-Control-Allow-Credentials", "true"));
	}

	@Test
	void otherOriginIsRejected() throws Exception {
		mockMvc.perform(options("/test/ping")
				.header("Origin", "https://evil.example.com")
				.header("Access-Control-Request-Method", "GET"))
			.andExpect(status().isForbidden());
	}

}

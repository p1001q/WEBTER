package com.webter;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// 성공·실패 응답이 모두 ApiResponse 형식(success, code, message, data)으로 내려가는지 확인한다
class GlobalExceptionHandlerTests extends IntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void successResponseUsesCommonFormat() throws Exception {
		mockMvc.perform(get("/test/ok"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.code").value("COMMON_200"))
			.andExpect(jsonPath("$.data").value("pong"));
	}

	@Test
	void businessExceptionBecomesErrorCodeResponse() throws Exception {
		mockMvc.perform(get("/test/business"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_404_01"))
			.andExpect(jsonPath("$.data").isEmpty());
	}

	@Test
	void validationFailureListsFieldErrors() throws Exception {
		mockMvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_400_01"))
			.andExpect(jsonPath("$.data.name").exists());
	}

	@Test
	void malformedJsonIsBadRequest() throws Exception {
		mockMvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON).content("{"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_400_01"));
	}

	@Test
	void unsupportedMethodIs405() throws Exception {
		mockMvc.perform(get("/test/validate"))
			.andExpect(status().isMethodNotAllowed())
			.andExpect(jsonPath("$.code").value("COMMON_405_01"));
	}

	@Test
	void unexpectedExceptionDoesNotLeakDetails() throws Exception {
		mockMvc.perform(get("/test/boom"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("COMMON_500_01"))
			.andExpect(content().string(not(containsString("내부 비밀 정보"))));
	}

}

package com.webter.domain.policy;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

class PolicyApiTests extends IntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void currentDocumentContentIsPublic() throws Exception {
		mockMvc.perform(get("/api/policies/terms"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.documentType").value("TERMS"))
			.andExpect(jsonPath("$.data.version").value("draft-1"))
			.andExpect(jsonPath("$.data.title").value("이용약관"))
			.andExpect(jsonPath("$.data.content").value(org.hamcrest.Matchers.containsString("## 제1조 목적")));
		mockMvc.perform(get("/api/policies/PRIVACY"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.documentType").value("PRIVACY"))
			.andExpect(jsonPath("$.data.content").value(org.hamcrest.Matchers.containsString("## 1. 처리하는 정보")));
	}

	@Test
	void unknownDocumentTypeIsNotFound() throws Exception {
		mockMvc.perform(get("/api/policies/unknown"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("COMMON_404_01"));
	}

}

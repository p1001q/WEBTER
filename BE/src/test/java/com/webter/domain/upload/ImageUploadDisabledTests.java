package com.webter.domain.upload;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.IntegrationTest;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

// 이미지 저장소 설정(bucket)이 없으면 업로드는 꺼진 상태로 503을 돌려준다.
class ImageUploadDisabledTests extends IntegrationTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void disabledWithoutBucket() throws Exception {
		mockMvc.perform(post("/api/uploads/images")
			.with(authentication(UsernamePasswordAuthenticationToken.authenticated(
					new SessionPrincipal.Member(UUID.randomUUID()), null, List.of(new SimpleGrantedAuthority("ROLE_USER")))))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"contentType\":\"image/png\",\"size\":10}"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.code").value("UPLOAD_503_01"));
	}

}

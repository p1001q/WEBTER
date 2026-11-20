package com.webter.domain.webservice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class RegistrationDraftApiTests extends DomainFixtureTest {

	static final String PATH = "/api/users/me/registration-draft";
	static final String PAYLOAD = """
			{"name":"작성 중","tagline":"","url":"","cats":[],"type":"","devices":[],"price":"",
			"owner":"","team":"","desc":"## 미완성","tags":[],"github":"","langs":["ko"],
			"iconImg":null,"thumbImg":null,"pv":[],"pvRatio":"land","pvFit":"cover",
			"allowGuest":false,"allowAnon":false,"allowAnonComment":false,"tagInput":"입력 중","scrollY":350}
			""";

	@Autowired MockMvc mvc;
	@Autowired JdbcTemplate jdbc;
	User maker;
	User other;

	@BeforeEach void setUp() { maker = createUser("draft_owner"); other = createUser("draft_other"); em.flush(); }
	RequestPostProcessor as(User user) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal.Member(user.getId()),
				null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
	}
	ResultActions save(User user, String revision, String payload) throws Exception {
		return mvc.perform(put(PATH).with(as(user)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"expectedRevision\":" + (revision == null ? "null" : "\"" + revision + "\"") + ",\"payload\":" + payload + "}"));
	}
	String saved(User user, String revision, String payload) throws Exception {
		return com.jayway.jsonpath.JsonPath.read(save(user, revision, payload).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString(), "$.data.revision");
	}

	@Test void incompleteDraftRoundTripsAndOnlyLatestOneRemainsWithoutPublishing() throws Exception {
		String first = saved(maker, null, PAYLOAD);
		String second = saved(maker, first, PAYLOAD.replace("작성 중", "다음 초안"));
		assertThat(second).isNotEqualTo(first);
		mvc.perform(get(PATH).with(as(maker))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.payload.name").value("다음 초안"))
			.andExpect(jsonPath("$.data.payload.tagInput").value("입력 중"))
			.andExpect(jsonPath("$.data.payload.scrollY").value(350));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM service_registration_drafts", Integer.class)).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM services", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM daily_usage", Integer.class)).isZero();
	}

	@Test void accountsHaveSeparateDraftsAndGuestsCannotReadThem() throws Exception {
		saved(maker, null, PAYLOAD);
		mvc.perform(get(PATH).with(as(other))).andExpect(jsonPath("$.data").value(nullValue()));
		saved(other, null, PAYLOAD.replace("작성 중", "다른 회원"));
		mvc.perform(get(PATH).with(as(maker))).andExpect(jsonPath("$.data.payload.name").value("작성 중"));
		mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
		mvc.perform(put(PATH).with(as(maker)).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isForbidden());
	}

	@Test void staleSaveAndDiscardCannotReplaceOrDeleteNewerDraft() throws Exception {
		String first = saved(maker, null, PAYLOAD);
		String second = saved(maker, first, PAYLOAD.replace("작성 중", "최신 내용"));
		save(maker, first, PAYLOAD).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DRAFT_409_01"));
		save(maker, null, PAYLOAD).andExpect(status().isConflict());
		mvc.perform(delete(PATH).with(as(maker)).with(csrf()).param("revision", first)).andExpect(status().isConflict());
		mvc.perform(get(PATH).with(as(maker))).andExpect(jsonPath("$.data.payload.name").value("최신 내용"));
		mvc.perform(delete(PATH).with(as(maker)).with(csrf()).param("revision", second)).andExpect(status().isOk());
		mvc.perform(get(PATH).with(as(maker))).andExpect(jsonPath("$.data").value(nullValue()));
	}

	@Test void transientAndForeignImagesAreNotStored() throws Exception {
		for (String image : List.of("data:image/png;base64,AAAA", "blob:local", "https://elsewhere.example/x.png")) {
			save(maker, null, PAYLOAD.replace("\"iconImg\":null", "\"iconImg\":\"" + image + "\""))
				.andExpect(status().isBadRequest());
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM service_registration_drafts", Integer.class)).isZero();
	}

	@Test void oversizedAndMalformedFieldsAreRejectedButBlankRequiredServiceFieldsAreAllowed() throws Exception {
		save(maker, null, PAYLOAD.replace("작성 중", "가".repeat(41))).andExpect(status().isBadRequest());
		save(maker, null, PAYLOAD.replace("\"scrollY\":350", "\"scrollY\":-1")).andExpect(status().isBadRequest());
		save(maker, null, PAYLOAD.replace("\"type\":\"\"", "\"type\":\"bad\"")).andExpect(status().isBadRequest());
		saved(maker, null, PAYLOAD.replace("작성 중", ""));
	}

	@Test void withdrawalDeletesPrivateDraft() throws Exception {
		saved(maker, null, PAYLOAD);
		jdbc.update("DELETE FROM users WHERE user_id = ?", maker.getId());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM service_registration_drafts", Integer.class)).isZero();
	}
}

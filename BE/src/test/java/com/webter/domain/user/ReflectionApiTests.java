package com.webter.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.json.JsonMapper;

class ReflectionApiTests extends DomainFixtureTest {

	static final String PATH = "/api/users/me/reflections";
	@Autowired MockMvc mvc;
	@Autowired JdbcTemplate jdbc;
	@Autowired JsonMapper json;
	User owner;
	User other;
	WebService service;
	WebService otherService;

	@BeforeEach void setUp() {
		owner = createUser("reflection_owner"); other = createUser("reflection_other");
		service = createService(owner, "https://reflection-owner.example.test");
		otherService = createService(other, "https://reflection-other.example.test"); em.flush();
	}
	RequestPostProcessor as(User user) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal.Member(user.getId()),
				null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
	}
	String create(User user, long serviceId, String title) throws Exception {
		return mvc.perform(post(PATH).with(as(user)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(java.util.Map.of("serviceId", serviceId, "title", title, "body", "    const learned = true;\n\n## 배운 점\n\n**비공개 기록**\n\n"))))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
	}
	String field(String response, String path) { return com.jayway.jsonpath.JsonPath.read(response, "$.data." + path); }
	String update(String revision, long serviceId, String title) {
		return json.writeValueAsString(java.util.Map.of("revision", revision, "serviceId", serviceId, "title", title, "body", "# 변경 내용"));
	}

	@Test void serviceLinkedMarkdownIsStoredPrivatelyAndCanBeReadByItsAuthor() throws Exception {
		String saved = create(owner, service.getId(), "첫 회고");
		String id = field(saved, "id");
		mvc.perform(get(PATH + "/" + id).with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.title").value("첫 회고"))
			.andExpect(jsonPath("$.data.body").value("    const learned = true;\n\n## 배운 점\n\n**비공개 기록**\n\n"))
			.andExpect(jsonPath("$.data.serviceId").value(service.getId().intValue()));
		mvc.perform(get("/api/users/" + owner.getId())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.reflections").doesNotExist());
		mvc.perform(get("/api/services/" + service.getId())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.reflections").doesNotExist());
	}

	@Test void otherMembersCannotReadEditOrDeleteAnAuthorsNote() throws Exception {
		String saved = create(owner, service.getId(), "개인 회고");
		String id = field(saved, "id"), revision = field(saved, "revision");
		mvc.perform(get(PATH + "/" + id).with(as(other))).andExpect(status().isNotFound());
		mvc.perform(put(PATH + "/" + id).with(as(other)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update(revision, otherService.getId(), "수정 시도"))).andExpect(status().isNotFound());
		mvc.perform(delete(PATH + "/" + id).with(as(other)).with(csrf()).param("revision", revision)).andExpect(status().isNotFound());
		mvc.perform(get(PATH).with(as(other))).andExpect(jsonPath("$.data.total").value(0));
		mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
		mvc.perform(get(PATH + "/" + id)).andExpect(status().isUnauthorized());
	}

	@Test void notesCanOnlyBeNewlyAttachedToServicesRegisteredByTheAuthor() throws Exception {
		mvc.perform(post(PATH).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"serviceId\":" + otherService.getId() + ",\"title\":\"회고\",\"body\":\"내용\"}"))
			.andExpect(status().isNotFound());
		String saved = create(owner, service.getId(), "정상 회고");
		mvc.perform(put(PATH + "/" + field(saved, "id")).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update(field(saved, "revision"), otherService.getId(), "연결 변경"))).andExpect(status().isNotFound());
	}

	@Test void updateAndDeleteRequireTheCurrentRevision() throws Exception {
		String saved = create(owner, service.getId(), "첫 회고");
		String id = field(saved, "id"), first = field(saved, "revision");
		String changed = mvc.perform(put(PATH + "/" + id).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update(first, service.getId(), "수정 회고"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.title").value("수정 회고")).andReturn().getResponse().getContentAsString();
		mvc.perform(put(PATH + "/" + id).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update(first, service.getId(), "늦은 응답"))).andExpect(status().isConflict());
		mvc.perform(delete(PATH + "/" + id).with(as(owner)).with(csrf()).param("revision", first)).andExpect(status().isConflict());
		mvc.perform(delete(PATH + "/" + id).with(as(owner)).with(csrf()).param("revision", field(changed, "revision"))).andExpect(status().isOk());
		mvc.perform(get(PATH + "/" + id).with(as(owner))).andExpect(status().isNotFound());
	}

	@Test void serviceFiltersAndPaginationOnlyListTheCurrentMembersNotes() throws Exception {
		WebService second = createService(owner, "https://reflection-second.example.test"); em.flush();
		create(owner, service.getId(), "첫째"); create(owner, second.getId(), "둘째"); create(other, otherService.getId(), "남의 회고");
		mvc.perform(get(PATH).with(as(owner)).param("size", "1").param("page", "1"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(2)).andExpect(jsonPath("$.data.items", hasSize(1)));
		mvc.perform(get(PATH).with(as(owner)).param("serviceId", String.valueOf(second.getId())))
			.andExpect(jsonPath("$.data.items[0].title").value("둘째")).andExpect(jsonPath("$.data.total").value(1));
	}

	@Test void deletingServicePreservesThePrivateHistoryAndWithdrawalRemovesIt() throws Exception {
		String saved = create(owner, service.getId(), "남기는 기록");
		jdbc.update("DELETE FROM services WHERE service_id = ?", service.getId());
		mvc.perform(get(PATH + "/" + field(saved, "id")).with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.serviceName").value(service.getName()));
		jdbc.update("DELETE FROM users WHERE user_id = ?", owner.getId());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_reflections", Integer.class)).isZero();
	}

	@Test void invalidContentPaginationAndMissingCsrfAreRejected() throws Exception {
		mvc.perform(post(PATH).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"serviceId\":" + service.getId() + ",\"title\":\"  \",\"body\":\"내용\"}"))
			.andExpect(status().isBadRequest());
		mvc.perform(post(PATH).with(as(owner)).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isForbidden());
		mvc.perform(get(PATH).with(as(owner)).param("page", "-1")).andExpect(status().isBadRequest());
		mvc.perform(get(PATH).with(as(owner)).param("size", "101")).andExpect(status().isBadRequest());
	}
}

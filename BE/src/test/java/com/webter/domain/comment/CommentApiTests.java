package com.webter.domain.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class CommentApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void rootWithRepliesLeavesOnlyTombstoneAndLastReplyRemovesIt() throws Exception {
		var owner = createUser("cm_owner");
		var member = createUser("cm_writer");
		long sid = createService(owner, "https://example.com/cm-thread").getId();
		String url = "/api/services/" + sid + "/comments";
		String root = write(url, member, "{\"text\":\"원댓글\"}");
		String first = write(url, owner, "{\"text\":\"첫 답글\",\"parentId\":\"" + root + "\"}");
		String second = write(url, member, "{\"text\":\"둘째 답글\",\"parentId\":\"" + root + "\"}");
		mvc.perform(post(url).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"대댓글\",\"parentId\":\"" + first + "\"}")).andExpect(status().isConflict());
		mvc.perform(delete(url + "/" + root).with(as(owner)).with(csrf())).andExpect(status().isForbidden());
		mvc.perform(delete(url + "/" + root).with(as(member)).with(csrf())).andExpect(status().isOk());
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].deleted").value(true))
			.andExpect(jsonPath("$.data.items[0].text").value("")).andExpect(jsonPath("$.data.items[0].a").doesNotExist())
			.andExpect(jsonPath("$.data.items[0].replyCount").value(2));
		mvc.perform(post(url).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"삭제 댓글에 답글\",\"parentId\":\"" + root + "\"}")).andExpect(status().isConflict());

		String page = mvc.perform(get(url).param("parentId", root).param("limit", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].id").value(first)).andReturn().getResponse().getContentAsString();
		String cursor = JsonPath.read(page, "$.data.nextCursor");
		mvc.perform(get(url).param("parentId", root).param("cursor", cursor)).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].id").value(second));
		mvc.perform(get(url).param("cursor", cursor)).andExpect(status().isBadRequest());
		mvc.perform(delete(url + "/" + first).with(as(owner)).with(csrf())).andExpect(status().isOk());
		mvc.perform(delete(url + "/" + second).with(as(member)).with(csrf())).andExpect(status().isOk());
		em.flush();
		assertThat(jdbc.queryForObject("select count(*) from service_comments where service_id = ?", Long.class, sid)).isZero();
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.data.items").isEmpty());
	}

	@Test
	void commentValidationCountsUnicodeAndDoesNotExposeAnonymousMember() throws Exception {
		var owner = createUser("cm_owner");
		var member = createUser("cm_writer");
		long sid = createService(owner, "https://example.com/cm-validation").getId();
		String url = "/api/services/" + sid + "/comments";
		String other = "/api/services/" + createService(owner, "https://example.com/cm-other").getId() + "/comments";
		mvc.perform(post(url).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"익명\",\"anon\":true}")).andExpect(status().isForbidden());
		jdbc.update("update services set allow_anonymous_comments = true where service_id = ?", sid);
		em.clear();
		mvc.perform(post(url).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"익명\",\"anon\":true}")).andExpect(status().isForbidden());
		for (String bad : new String[] {"   ", "www.example.com", "[링크](/target)", "😀".repeat(501)}) {
			mvc.perform(post(url).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"text\":\"" + bad + "\"}")).andExpect(status().isBadRequest());
		}
		String root = write(url, member, "{\"text\":\"" + "😀".repeat(500) + "\",\"anon\":true}");
		mvc.perform(post(other).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"다른 서비스\",\"parentId\":\"" + root + "\"}")).andExpect(status().isNotFound());
		mvc.perform(patch(url + "/" + root).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"수정\",\"anon\":false}")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.edited").value(true))
			.andExpect(jsonPath("$.data.a.anonymous").value(true))
			.andExpect(jsonPath("$.data.mine").value(true))
			.andExpect(jsonPath("$.data.a.uid").doesNotExist());
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].a.uid").doesNotExist())
			.andExpect(jsonPath("$.data.items[0].mine").value(false));
		mvc.perform(delete(url + "/" + root).with(as(member)).with(csrf())).andExpect(status().isOk());
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.data.items").isEmpty());
	}

	private String write(String url, User member, String body) throws Exception {
		String response = mvc.perform(post(url).with(as(member)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		return JsonPath.read(response, "$.data.id");
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

}

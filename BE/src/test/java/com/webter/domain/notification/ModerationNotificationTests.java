package com.webter.domain.notification;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** 신고·관리자 처리가 대상 작성자에게 알림을 남기는지 확인한다. */
class ModerationNotificationTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void serviceHideRestoreAndFinalHideNotifyTheMakers() throws Exception {
		User owner = createUser("mn_owner");
		User admin = admin();
		String id = createService(owner, "https://example.com/mn-service").getId().toString();
		flushAndClear();
		reportAll(reporters("mn_s"), "SERVICE", id, "PHISHING_MALWARE");

		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(owner, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("SERVICE_HIDDEN"))
			.andExpect(jsonPath("$.data.items[0].targetKind").value("SERVICE"))
			.andExpect(jsonPath("$.data.items[0].serviceId").value(id))
			.andExpect(jsonPath("$.data.items[0].serviceName").exists())
			.andExpect(jsonPath("$.data.items[0].actor").doesNotExist());

		action(admin, "SERVICE", id, "RESTORE", "검토 후 복구").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(owner, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("SERVICE_UNHIDDEN"));

		action(admin, "SERVICE", id, "HIDE", "최종 검토 결과").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(owner, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("SERVICE_BLOCKED"))
			.andExpect(jsonPath("$.data.items[0].reason").value("최종 검토 결과"))
			.andExpect(jsonPath("$.data.items.length()").value(3));
	}

	@Test
	void hiddenReviewCommentAndProfileNotifyTheirAuthorsByKind() throws Exception {
		User owner = createUser("mn_threads");
		User writer = createUser("mn_writer");
		String service = "/api/services/" + createService(owner, "https://example.com/mn-threads").getId();
		flushAndClear();
		String reviewId = read(write(service + "/reviews", writer, "{\"text\":\"리뷰 본문\"}"), "$.data.id");
		String commentId = read(write(service + "/comments", writer, "{\"text\":\"댓글 본문\"}"), "$.data.id");
		flushAndClear();
		reportAll(reporters("mn_t"), "REVIEW", reviewId, "ABUSE");
		reportAll(reporters("mn_c"), "COMMENT", commentId, "ABUSE");
		reportAll(reporters("mn_p"), "PROFILE", writer.getId().toString(), "SPAM_IMPERSONATION");

		flushAndClear();
		String body = mvc.perform(get("/api/notifications").with(as(writer, "USER"))).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		List<String> kinds = JsonPath.read(body, "$.data.items[?(@.type=='CONTENT_HIDDEN')].targetKind");
		org.assertj.core.api.Assertions.assertThat(kinds).containsExactlyInAnyOrder("REVIEW", "COMMENT", "PROFILE");
		List<String> reviewIds = JsonPath.read(body, "$.data.items[?(@.targetKind=='REVIEW')].reviewId");
		List<String> commentIds = JsonPath.read(body, "$.data.items[?(@.targetKind=='COMMENT')].commentId");
		org.assertj.core.api.Assertions.assertThat(reviewIds).containsExactly(reviewId);
		org.assertj.core.api.Assertions.assertThat(commentIds).containsExactly(commentId);
		// 서비스 등록자는 이 알림을 받지 않는다
		mvc.perform(get("/api/notifications").with(as(owner, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[?(@.type=='CONTENT_HIDDEN')]").isEmpty());
	}

	@Test
	void registrationRestrictionIsNotifiedWithTheReasonButWarningIsNot() throws Exception {
		User admin = admin();
		User member = createUser("mn_restricted");
		String url = "/api/admin/users/" + member.getId() + "/sanctions";
		flushAndClear();
		sanction(url, admin, "WARNING", "정책 위반 경고").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(member, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items").isEmpty());

		sanction(url, admin, "REGISTRATION_RESTRICTED", "등록 규칙 위반").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(member, "USER"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items.length()").value(1))
			.andExpect(jsonPath("$.data.items[0].type").value("REGISTRATION_RESTRICTED"))
			.andExpect(jsonPath("$.data.items[0].reason").value("등록 규칙 위반"))
			.andExpect(jsonPath("$.data.items[0].serviceId").doesNotExist());
	}

	private void reportAll(List<User> reporters, String type, String id, String reason) throws Exception {
		for (User reporter : reporters) {
			write("/api/reports", reporter, """
				{"targetType":"%s","targetId":"%s","reason":"%s"}
				""".formatted(type, id, reason)).andExpect(status().isCreated());
		}
	}

	private List<User> reporters(String prefix) {
		return List.of(createUser(prefix + "1"), createUser(prefix + "2"), createUser(prefix + "3"),
			createUser(prefix + "4"));
	}

	private User admin() {
		User user = createUser("mn_admin");
		em.flush();
		jdbc.update("update users set role = 'ADMIN' where user_id = ?", user.getId());
		em.clear();
		return user;
	}

	private ResultActions action(User admin, String type, String id, String action, String reason) throws Exception {
		return sanction("/api/admin/reports/" + type + "/" + id + "/actions", admin, action, reason);
	}

	private ResultActions sanction(String path, User admin, String action, String reason) throws Exception {
		return mvc.perform(post(path).with(as(admin, "ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
				{"action":"%s","reason":"%s"}
				""".formatted(action, reason)));
	}

	private ResultActions write(String path, User user, String body) throws Exception {
		return mvc.perform(post(path).with(as(user, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private static String read(ResultActions result, String path) throws Exception {
		return JsonPath.read(result.andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString(),
			path);
	}

	private static RequestPostProcessor as(User user, String role) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_" + role)));
	}

}

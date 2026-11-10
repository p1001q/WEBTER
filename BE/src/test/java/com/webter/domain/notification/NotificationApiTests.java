package com.webter.domain.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class NotificationApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void reviewsCommentsAndRepliesNotifyTheRightPeopleWithoutRevealingAnonymousAuthors() throws Exception {
		var owner = createUser("nt_owner");
		var writer = createUser("nt_writer");
		var other = createUser("nt_other");
		long sid = createService(owner, "https://example.com/nt-events").getId();
		jdbc.update("update services set allow_anonymous_reviews = true, allow_anonymous_comments = true, "
				+ "allow_guest_reviews = true where service_id = ?", sid);
		em.clear();
		String base = "/api/services/" + sid;

		// 리뷰: 등록자만 알림을 받고 작성자는 받지 않는다
		String reviewId = postAs(base + "/reviews", writer, "{\"text\":\"리뷰 본문\",\"rate\":\"RECOMMEND\"}");
		assertThat(types(owner)).containsExactly("REVIEW_CREATED");
		assertThat(types(writer)).isEmpty();
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].actor.username").value("nt_writer"))
			.andExpect(jsonPath("$.data.items[0].reviewId").value(reviewId))
			.andExpect(jsonPath("$.data.items[0].serviceId").value(String.valueOf(sid)))
			.andExpect(jsonPath("$.data.items[0].quote").value("리뷰 본문"));

		// 익명 리뷰·비회원 리뷰는 알림에 작성자를 담지 않는다
		postAs(base + "/reviews", other, "{\"text\":\"익명 리뷰\",\"anon\":true}");
		mvc.perform(post(base + "/reviews/guest").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"비회원 리뷰\"}")).andExpect(status().isOk());
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("REVIEW_CREATED"))
			.andExpect(jsonPath("$.data.items[0].actor").doesNotExist())
			.andExpect(jsonPath("$.data.items[1].actor").doesNotExist())
			.andExpect(jsonPath("$.data.items[1].quote").value("익명 리뷰"));

		// 제작자 답글: 리뷰 작성자에게. 같은 답글을 고쳐 쓰면 다시 알리지 않는다
		putAs(base + "/reviews/" + reviewId + "/reply", owner, "{\"text\":\"감사합니다\"}");
		putAs(base + "/reviews/" + reviewId + "/reply", owner, "{\"text\":\"고쳐 씁니다\"}");
		assertThat(types(writer)).containsExactly("REVIEW_REPLY");
		mvc.perform(get("/api/notifications").with(as(writer))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].actor.username").value("nt_owner"))
			.andExpect(jsonPath("$.data.items[0].reviewId").value(reviewId));

		// 댓글: 등록자에게. 자기 서비스에 쓴 댓글은 알리지 않는다
		String commentId = postAs(base + "/comments", writer, "{\"text\":\"질문 있어요\"}");
		postAs(base + "/comments", owner, "{\"text\":\"등록자 댓글\"}");
		assertThat(types(owner)).startsWith("COMMENT_CREATED");
		assertThat(types(owner).stream().filter("COMMENT_CREATED"::equals).count()).isEqualTo(1);

		// 답글: 부모 댓글 작성자에게만. 자기 댓글에 쓴 답글은 알리지 않는다
		postAs(base + "/comments", other, "{\"text\":\"답글\",\"parentId\":\"" + commentId + "\"}");
		postAs(base + "/comments", writer, "{\"text\":\"내 댓글에 내가\",\"parentId\":\"" + commentId + "\"}");
		mvc.perform(get("/api/notifications").with(as(writer))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("COMMENT_REPLY"))
			.andExpect(jsonPath("$.data.items[0].actor.username").value("nt_other"))
			.andExpect(jsonPath("$.data.items[0].commentId").exists())
			.andExpect(jsonPath("$.data.items[0].quote").value("답글"));
		assertThat(types(writer).stream().filter("COMMENT_REPLY"::equals).count()).isEqualTo(1);
		assertThat(types(other)).isEmpty();

		// 익명 댓글은 작성자를 숨긴다
		postAs(base + "/comments", other, "{\"text\":\"익명 댓글\",\"anon\":true}");
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("COMMENT_CREATED"))
			.andExpect(jsonPath("$.data.items[0].actor").doesNotExist());
	}

	@Test
	void listingPagesReadAndDeleteOnlyTouchMyOwnNotifications() throws Exception {
		var owner = createUser("nt_owner");
		var writer = createUser("nt_writer");
		long sid = createService(owner, "https://example.com/nt-list").getId();
		String comments = "/api/services/" + sid + "/comments";
		for (int i = 1; i <= 4; i++) {
			postAs(comments, writer, "{\"text\":\"댓글 " + i + "\"}");
		}
		mvc.perform(get("/api/notifications/unread-count").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.count").value(4));

		String page = mvc.perform(get("/api/notifications").param("limit", "3").with(as(owner)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.items.length()").value(3))
			.andExpect(jsonPath("$.data.items[0].quote").value("댓글 4")).andReturn().getResponse()
			.getContentAsString();
		String cursor = JsonPath.read(page, "$.data.nextCursor");
		String firstId = JsonPath.read(page, "$.data.items[0].id");
		mvc.perform(get("/api/notifications").param("limit", "3").param("cursor", cursor).with(as(owner)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.items.length()").value(1))
			.andExpect(jsonPath("$.data.items[0].quote").value("댓글 1")).andExpect(jsonPath("$.data.nextCursor").doesNotExist());
		mvc.perform(get("/api/notifications").param("limit", "0").with(as(owner))).andExpect(status().isBadRequest());
		mvc.perform(get("/api/notifications").param("cursor", "garbage").with(as(owner))).andExpect(status().isBadRequest());
		mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());

		// 남의 알림은 읽거나 지울 수 없다
		mvc.perform(put("/api/notifications/" + firstId + "/read").with(as(writer)).with(csrf()))
			.andExpect(status().isNotFound());
		mvc.perform(delete("/api/notifications/" + firstId).with(as(writer)).with(csrf())).andExpect(status().isNotFound());

		mvc.perform(put("/api/notifications/" + firstId + "/read").with(as(owner)).with(csrf())).andExpect(status().isOk());
		mvc.perform(get("/api/notifications/unread-count").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.count").value(3));
		mvc.perform(get("/api/notifications").param("unread", "true").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items.length()").value(3));
		mvc.perform(put("/api/notifications/read-all").with(as(owner)).with(csrf())).andExpect(status().isOk());
		mvc.perform(get("/api/notifications/unread-count").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.count").value(0));

		mvc.perform(delete("/api/notifications/" + firstId).with(as(owner)).with(csrf())).andExpect(status().isOk());
		assertThat(types(owner)).hasSize(3);
		mvc.perform(delete("/api/notifications").with(as(owner)).with(csrf())).andExpect(status().isOk());
		assertThat(types(owner)).isEmpty();
	}

	@Test
	void anAlertSurvivesTheDeletionOfItsTargetWithoutAQuote() throws Exception {
		var owner = createUser("nt_owner");
		var writer = createUser("nt_writer");
		long sid = createService(owner, "https://example.com/nt-target").getId();
		String commentId = postAs("/api/services/" + sid + "/comments", writer, "{\"text\":\"곧 지울 댓글\"}");
		mvc.perform(delete("/api/services/" + sid + "/comments/" + commentId).with(as(writer)).with(csrf()))
			.andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("COMMENT_CREATED"))
			.andExpect(jsonPath("$.data.items[0].commentId").doesNotExist())
			.andExpect(jsonPath("$.data.items[0].quote").doesNotExist())
			.andExpect(jsonPath("$.data.items[0].serviceName").exists());
	}

	private List<String> types(User user) throws Exception {
		String body = mvc.perform(get("/api/notifications").param("limit", "100").with(as(user)))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return JsonPath.read(body, "$.data.items[*].type");
	}

	private String postAs(String url, User user, String body) throws Exception {
		return id(mvc.perform(post(url).with(as(user)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
	}

	private String putAs(String url, User user, String body) throws Exception {
		return id(mvc.perform(put(url).with(as(user)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
	}

	private static String id(String response) {
		return JsonPath.read(response, "$.data.id");
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

}

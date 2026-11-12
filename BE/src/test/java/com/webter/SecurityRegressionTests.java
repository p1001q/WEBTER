package com.webter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

// 공개 전 보안 점검에서 확인한 사례를 회귀 테스트로 남긴다(#40): 검색·페이지 입력의 SQL 형태 문자열,
// 사용자 입력 HTML이 응답에서 그대로 데이터로만 내려가는지, 로그인 없이·일반 회원으로 접근할 수 없는 경로.
class SecurityRegressionTests extends DomainFixtureTest {

	private static final String[] SQL_PAYLOADS = { "' OR '1'='1", "'; DROP TABLE services; --", "x') OR 1=1 --",
			"%", "_", "\\", "\" OR \"\"=\"", "1; SELECT pg_sleep(5)" };

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	static RequestPostProcessor as(User user, String role) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()), null,
				AuthorityUtils.createAuthorityList("ROLE_" + role)));
	}

	@Test
	void searchTextWithSqlFragmentsOrLikeWildcardsDoesNotWidenResults() throws Exception {
		User owner = createUser("sec_owner");
		long sid = createService(owner, "https://example.com/sec-search").getId();
		jdbc.update("UPDATE services SET name = '보안 점검 서비스', tagline = '일반 소개' WHERE service_id = ?", sid);
		flushAndClear();

		// 일반 검색어는 찾아낸다(비교 기준)
		mvc.perform(get("/api/services").param("q", "보안 점검")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.total").value(1));
		for (String payload : SQL_PAYLOADS) {
			// 조건이 참이 되거나 와일드카드로 해석되면 서비스가 걸리므로, 어느 경우에도 0건이어야 한다
			mvc.perform(get("/api/services").param("q", payload)).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.total").value(0))
				.andExpect(jsonPath("$.data.items").isEmpty());
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM services WHERE service_id = ?", Long.class, sid))
			.isEqualTo(1);
	}

	@Test
	void filterAndSortParametersRejectOrIgnoreSqlFragments() throws Exception {
		User owner = createUser("sec_filter");
		createService(owner, "https://example.com/sec-filter");
		flushAndClear();

		for (String payload : SQL_PAYLOADS) {
			mvc.perform(get("/api/services").param("category", payload)).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.total").value(0));
			// 열거형 값은 목록에 없는 문자열이면 400이다(쿼리에 도달하지 않는다)
			for (String name : new String[] { "sort", "type", "device", "price", "registrant", "language",
					"availability", "period" }) {
				mvc.perform(get("/api/services").param(name, payload)).andExpect(status().isBadRequest());
			}
		}
		mvc.perform(get("/api/services").param("page", "1; DROP TABLE services")).andExpect(status().isBadRequest());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM services", Long.class)).isEqualTo(1);
	}

	@Test
	void malformedCursorsAreClientErrorsNotServerErrorsOrWiderPages() throws Exception {
		User owner = createUser("sec_cursor");
		User member = createUser("sec_cursor_mem");
		long sid = createService(owner, "https://example.com/sec-cursor").getId();
		flushAndClear();

		for (String payload : SQL_PAYLOADS) {
			mvc.perform(get("/api/services/" + sid + "/reviews").param("cursor", payload))
				.andExpect(status().is4xxClientError());
			mvc.perform(get("/api/services/" + sid + "/comments").param("cursor", payload))
				.andExpect(status().is4xxClientError());
			mvc.perform(get("/api/notifications").with(as(member, "USER")).param("cursor", payload))
				.andExpect(status().is4xxClientError());
		}
		mvc.perform(get("/api/services/" + sid + "/comments").param("parentId", "1 OR 1=1"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void userTextWithHtmlIsReturnedAsPlainJsonDataWithHardeningHeaders() throws Exception {
		User owner = createUser("sec_xss_owner");
		User member = createUser("sec_xss_mem");
		long sid = createService(owner, "https://example.com/sec-xss").getId();
		flushAndClear();
		String html = "<img src=x onerror=alert(1)><script>alert(1)</script>";
		String base = "/api/services/" + sid;

		mvc.perform(post(base + "/comments").with(as(member, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"" + html.replace("\"", "\\\"") + "\"}")).andExpect(status().isOk());
		String listed = mvc.perform(get(base + "/comments")).andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			// 서버는 입력을 바꾸지 않고 JSON 문자열로만 내려 주며, 화면은 이를 텍스트로 출력한다
			.andExpect(header().string("X-Content-Type-Options", "nosniff"))
			.andExpect(header().string("X-Frame-Options", "DENY"))
			.andReturn().getResponse().getContentAsString();
		assertThat(JsonPath.<String>read(listed, "$.data.items[0].text")).isEqualTo(html);

		// 응답 형식 자체가 HTML이 아니므로 브라우저가 문서로 해석하지 않는다
		mvc.perform(get(base + "/comments")).andExpect(content().string(not(containsString("<!DOCTYPE"))));
	}

	@ParameterizedTest
	@ValueSource(strings = { "GET /api/users/me/services", "GET /api/users/me/liked", "GET /api/users/me/saved",
			"GET /api/users/me/reviews", "GET /api/users/me/comments", "PUT /api/users/me", "DELETE /api/users/me",
			"POST /api/services", "PUT /api/services/1", "DELETE /api/services/1",
			"PUT /api/services/1/availability", "PUT /api/services/1/versions", "POST /api/services/url-check",
			"POST /api/services/1/reviews", "PUT /api/services/1/rating",
			"DELETE /api/services/1/rating", "PATCH /api/services/1/reviews/1", "DELETE /api/services/1/reviews/1",
			"PUT /api/services/1/reviews/1/vote", "PUT /api/services/1/reviews/1/reply",
			"POST /api/services/1/comments", "PATCH /api/services/1/comments/1", "DELETE /api/services/1/comments/1",
			"PUT /api/services/1/reactions/LIKE", "DELETE /api/services/1/reactions/LIKE",
			"POST /api/services/1/events/VIEW",
			"POST /api/services/1/team/invitations", "DELETE /api/services/1/team/invitations/1",
			"DELETE /api/services/1/team/members/1", "POST /api/invitations/1/accept",
			"POST /api/invitations/1/decline", "GET /api/notifications", "GET /api/notifications/unread-count",
			"PUT /api/notifications/read-all", "PUT /api/notifications/1/read", "DELETE /api/notifications/1",
			"DELETE /api/notifications", "POST /api/reports", "POST /api/uploads/images", "POST /api/auth/signup",
			"GET /api/auth/username-available", "GET /api/admin/reports", "GET /api/admin/reports/SERVICE/1",
			"POST /api/admin/reports/SERVICE/1/actions", "GET /api/admin/temporarily-hidden",
			"POST /api/admin/users/1/sanctions", "GET /api/admin/moderation-actions" })
	void anonymousVisitorsAreRejectedOnEveryProtectedEndpoint(String endpoint) throws Exception {
		HttpMethod method = HttpMethod.valueOf(endpoint.substring(0, endpoint.indexOf(' ')));
		String path = endpoint.substring(endpoint.indexOf(' ') + 1);
		// CSRF 토큰을 붙여도 로그인하지 않았으면 401이어야 한다(토큰 검사에 가려진 403이 아니다)
		mvc.perform(request(method, path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void publicTeamAndMyReviewReadsAreOpenButCandidateSearchRequiresLogin() throws Exception {
		User owner = createUser("sec_team_owner");
		long sid = createService(owner, "https://example.com/sec-team").getId();
		createUser("sec_team_target");
		flushAndClear();
		String base = "/api/services/" + sid;

		// 팀 구성과 내 리뷰는 GET /api/services/** 공개 규칙에 포함되지만 비로그인에게 개인 정보를 주지 않는다
		mvc.perform(get(base + "/team")).andExpect(status().isOk()).andExpect(jsonPath("$.data.canManage").value(false))
			.andExpect(jsonPath("$.data.invitations").isEmpty());
		mvc.perform(get(base + "/reviews/me")).andExpect(status().isOk()).andExpect(jsonPath("$.data").doesNotExist());
		// 회원 아이디 검색은 등록자·팀원만 쓸 수 있다
		mvc.perform(get(base + "/team/candidates").param("q", "sec_team")).andExpect(status().isUnauthorized());
		mvc.perform(get(base + "/team/candidates").param("q", "sec_team").with(as(createUser("sec_team_other"), "USER")))
			.andExpect(status().isForbidden());
	}

	@ParameterizedTest
	@ValueSource(strings = { "GET /api/admin/reports", "GET /api/admin/reports/SERVICE/1",
			"POST /api/admin/reports/SERVICE/1/actions", "GET /api/admin/temporarily-hidden",
			"POST /api/admin/users/1/sanctions", "GET /api/admin/moderation-actions" })
	void ordinaryMembersCannotUseAdminEndpoints(String endpoint) throws Exception {
		User member = createUser("sec_plain_member");
		flushAndClear();
		HttpMethod method = HttpMethod.valueOf(endpoint.substring(0, endpoint.indexOf(' ')));
		String path = endpoint.substring(endpoint.indexOf(' ') + 1);
		mvc.perform(request(method, path).with(as(member, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{}")).andExpect(status().isForbidden());
	}

	@Test
	void stateChangingRequestsWithoutCsrfTokenAreRejectedEvenWhenLoggedIn() throws Exception {
		User member = createUser("sec_csrf_member");
		flushAndClear();
		List<String> mutations = List.of("POST /api/services", "PUT /api/users/me", "DELETE /api/users/me",
				"PUT /api/notifications/read-all", "POST /api/reports");
		for (String endpoint : mutations) {
			HttpMethod method = HttpMethod.valueOf(endpoint.substring(0, endpoint.indexOf(' ')));
			mvc.perform(request(method, endpoint.substring(endpoint.indexOf(' ') + 1)).with(as(member, "USER"))
				.contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
		}
	}

}

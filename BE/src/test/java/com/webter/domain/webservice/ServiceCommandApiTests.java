package com.webter.domain.webservice;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
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
import com.webter.domain.webservice.service.UrlProbe;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

// 서비스 등록·수정·삭제, 운영 상태, 버전 기록, 주소 검사, 내 서비스 조회를 확인한다. 각 테스트는 롤백된다.
class ServiceCommandApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	// 외부 접속 없이 접속 가능 여부를 정한다
	@MockitoBean
	UrlProbe probe;

	User maker;

	User other;

	@BeforeEach
	void setUp() {
		maker = createUser("maker_two");
		other = createUser("other_two");
		em.flush();
		when(probe.isReachable(anyString())).thenReturn(true);
	}

	RequestPostProcessor as(User user, String role) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(
				new SessionPrincipal.Member(user.getId()), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
	}

	static String body(String url) {
		return body("타이머", url, "[\"PRODUCTIVITY\",\"UTILITY\"]", "[\"집중\",\"#타이머\"]", "true");
	}

	static String body(String name, String url, String categories, String tags, String agree) {
		return """
				{"name":"%s","tagline":"집중을 돕는 타이머","url":"%s","githubUrl":"https://github.com/maker/timer",
				 "categories":%s,"projectType":"SIDE","devices":["PC","MOBILE"],"priceType":"FREE","teamName":null,
				 "description":"## 소개\\n타이머예요","tags":%s,"languages":["KO"],"agreeRegistration":%s}"""
			.formatted(name, url, categories, tags, agree);
	}

	ResultActions create(User user, String json) throws Exception {
		return mockMvc.perform(post("/api/services").with(as(user, "USER")).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(json));
	}

	long createOk(User user, String url) throws Exception {
		String response = create(user, body(url)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return Long.parseLong(com.jayway.jsonpath.JsonPath.<String>read(response, "$.data.id"));
	}

	@Test
	void registrationCreatesAServiceThatIsListedPublicly() throws Exception {
		create(maker, body("https://Timer.Example.test/"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.name").value("타이머"))
			.andExpect(jsonPath("$.data.categories", contains("PRODUCTIVITY", "UTILITY")))
			// 앞의 #은 떼고 순서를 유지한다
			.andExpect(jsonPath("$.data.tags", contains("집중", "타이머")))
			.andExpect(jsonPath("$.data.registrantType").value("INDIVIDUAL"))
			.andExpect(jsonPath("$.data.availability").value("AVAILABLE"))
			.andExpect(jsonPath("$.data.visibility").value("PUBLIC"))
			.andExpect(jsonPath("$.data.owner.username").value("maker_two"))
			.andExpect(jsonPath("$.data.githubUrl").value("https://github.com/maker/timer"));
		mockMvc.perform(get("/api/services")).andExpect(jsonPath("$.data.total").value(1));
		org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
				"SELECT used_count FROM daily_usage WHERE usage_type = 'SERVICE_REGISTRATION'", Integer.class)).isEqualTo(1);
	}

	@Test
	void teamNameMakesATeamRegistration() throws Exception {
		create(maker, body("팀 서비스", "https://team.example.test", "[\"PLAY\"]", "[]", "true").replace("\"teamName\":null", "\"teamName\":\" 얼렁뚱땅 \""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.registrantType").value("TEAM"))
			.andExpect(jsonPath("$.data.teamName").value("얼렁뚱땅"));
	}

	@Test
	void invalidInputIsRejectedWithSpecificCodes() throws Exception {
		create(maker, body("a", "http://insecure.example.test", "[\"PLAY\"]", "[]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_02"));
		create(maker, body("a", "https://github.com/maker/timer", "[\"PLAY\"]", "[]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_03"));
		create(maker, body("a", "https://ok.example.test", "[\"NOPE\"]", "[]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_05"));
		create(maker, body("a", "https://ok.example.test", "[\"PLAY\",\"PLAY\"]", "[]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_05"));
		create(maker, body("a", "https://ok.example.test", "[\"PLAY\"]", "[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\"]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_07"));
		create(maker, body("a", "https://ok.example.test", "[\"PLAY\"]", "[]", "false"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_09"));
		create(maker, body("가".repeat(31), "https://ok.example.test", "[\"PLAY\"]", "[]", "true"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_400_01"));
		create(maker, body("a", "https://ok.example.test", "[\"PLAY\"]", "[]", "true").replace("https://github.com/maker/timer", "https://example.com/not-github"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_04"));
		create(maker, body("a", "https://ok.example.test", "[\"PLAY\"]", "[]", "true").replace("\"languages\"", "\"iconUrl\":\"javascript:alert(1)\",\"languages\""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_06"));
		// 실패한 요청은 하루 등록 횟수를 쓰지 않는다
		org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject("SELECT count(*) FROM daily_usage", Integer.class)).isZero();
		mockMvc.perform(get("/api/services")).andExpect(jsonPath("$.data.items", empty()));
		// 업로드 경로로 위장한 상위 경로·인코딩된 점·권한이 있는 주소는 거절한다
		for (String icon : List.of("/uploads/%2e%2e/api/x", "/uploads/../api/x", "/uploads/a b", "//evil.example.test/uploads/x", "/uploads/a\\\\b")) {
			create(maker, body("a", "https://ok.example.test", "[\"PLAY\"]", "[]", "true").replace("\"languages\"", "\"iconUrl\":\"" + icon.replace("\\", "\\\\") + "\",\"languages\""))
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_06"));
		}
		create(maker, body("a", "https://ok1.example.test", "[\"PLAY\"]", "[]", "true").replace("\"languages\"", "\"iconUrl\":\"/uploads/icon.png\",\"languages\""))
			.andExpect(status().isCreated()).andExpect(jsonPath("$.data.iconUrl").value("/uploads/icon.png"));
	}

	@Test
	void sameUrlCannotBeRegisteredTwiceEvenWithDifferentCaseOrTrailingSlash() throws Exception {
		createOk(maker, "https://dup.example.test");
		create(other, body("https://DUP.example.test/")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("SERVICE_409_01"));
		// 중복으로 거절돼도 횟수는 올라가지 않는다
		org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM daily_usage WHERE user_id = ?", Integer.class, other.getId())).isZero();
	}

	@Test
	void fiveServicesPerDayThenRejected() throws Exception {
		for (int i = 1; i <= 5; i++) {
			createOk(maker, "https://limit" + i + ".example.test");
		}
		create(maker, body("https://limit6.example.test")).andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("SERVICE_429_01"));
		// 다른 계정의 한도에는 영향이 없다
		createOk(other, "https://limit-other.example.test");
	}

	@Test
	void restrictedAccountCannotRegister() throws Exception {
		jdbc.update("UPDATE users SET account_status = 'REGISTRATION_RESTRICTED' WHERE user_id = ?", maker.getId());
		em.clear();
		create(maker, body("https://restricted.example.test")).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("SERVICE_403_02"));
	}

	@Test
	void anonymousAndCsrfAreRequired() throws Exception {
		mockMvc.perform(post("/api/services").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(body("https://anon.example.test"))).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/services").with(as(maker, "USER")).contentType(MediaType.APPLICATION_JSON)
			.content(body("https://nocsrf.example.test"))).andExpect(status().isForbidden());
	}

	@Test
	void ownerAndAdminCanUpdateOthersCannot() throws Exception {
		long id = createOk(maker, "https://edit.example.test");
		String update = body("바뀐 이름", "https://edit.example.test", "[\"PLAY\"]", "[\"새태그\"]", "true");
		// 남에게는 서비스가 없는 것처럼 보인다
		mockMvc.perform(put("/api/services/" + id).with(as(other, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update)).andExpect(status().isNotFound());
		// 같은 주소를 그대로 두면 자기 자신과의 중복이 아니다
		mockMvc.perform(put("/api/services/" + id).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(update))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.name").value("바뀐 이름"))
			.andExpect(jsonPath("$.data.categories", contains("PLAY")))
			.andExpect(jsonPath("$.data.tags", contains("새태그")));
		mockMvc.perform(put("/api/services/" + id).with(as(other, "ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(body("관리자 수정", "https://edit.example.test", "[\"ETC\"]", "[]", "true")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.name").value("관리자 수정"));
	}

	@Test
	void changingTheUrlChecksDuplicatesAgain() throws Exception {
		createOk(maker, "https://taken.example.test");
		long id = createOk(maker, "https://mine.example.test");
		mockMvc.perform(put("/api/services/" + id).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(body("https://taken.example.test"))).andExpect(status().isConflict());
		mockMvc.perform(put("/api/services/" + id).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content(body("https://moved.example.test")))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.url").value("https://moved.example.test"));
	}

	@Test
	void deleteRemovesTheServiceAndItsChildren() throws Exception {
		long id = createOk(maker, "https://gone.example.test");
		jdbc.update("INSERT INTO service_reactions (user_id, service_id, reaction_type) VALUES (?, ?, 'LIKE')", other.getId(), id);
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content) VALUES (?, ?, 'MEMBER', 'RECOMMEND', '좋아요')", id, other.getId());
		mockMvc.perform(delete("/api/services/" + id).with(as(other, "USER")).with(csrf())).andExpect(status().isNotFound());
		mockMvc.perform(delete("/api/services/" + id).with(as(maker, "USER")).with(csrf())).andExpect(status().isOk());
		mockMvc.perform(get("/api/services/" + id)).andExpect(status().isNotFound());
		for (String table : List.of("service_reactions", "reviews", "service_categories", "service_tags")) {
			org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE service_id = ?", Integer.class, id))
				.as(table).isZero();
		}
	}

	@Test
	void stoppingRequiresAReasonAndResumingClearsIt() throws Exception {
		long id = createOk(maker, "https://stop.example.test");
		String path = "/api/services/" + id + "/availability";
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"UNAVAILABLE\",\"reason\":\"  \"}"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_08"));
		mockMvc.perform(put(path).with(as(other, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검\"}")).andExpect(status().isNotFound());
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검 중\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.availability").value("UNAVAILABLE"))
			.andExpect(jsonPath("$.data.unavailableReason").value("점검 중"));
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"AVAILABLE\",\"reason\":\"무시됨\"}"))
			.andExpect(jsonPath("$.data.availability").value("AVAILABLE"))
			.andExpect(jsonPath("$.data.unavailableReason").doesNotExist());
	}

	@Test
	void versionsAreAddedEditedAndRemovedKeepingTheFirstDate() throws Exception {
		long id = createOk(maker, "https://versions.example.test");
		String path = "/api/services/" + id + "/versions";
		var added = mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("[{\"version\":\"v1.0\",\"title\":\"첫 공개\",\"content\":\"처음\"},{\"version\":\"v1.1\",\"title\":\"수정\",\"content\":\"버그\"}]"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.versions", hasSize(2))).andReturn().getResponse().getContentAsString();
		List<String> firstIds = com.jayway.jsonpath.JsonPath.read(added, "$.data.versions[?(@.version=='v1.0')].id");
		String firstId = firstIds.getFirst();
		jdbc.update("UPDATE service_versions SET created_at = '2026-01-01T00:00:00Z' WHERE service_version_id = ?", Long.parseLong(firstId));
		// 테스트는 한 트랜잭션이라 SQL로 바꾼 값을 다시 읽도록 영속성 컨텍스트를 비운다(실제 요청은 요청마다 새로 읽는다)
		em.clear();
		// 첫 기록은 내용을 고치고(일자 유지) 둘째는 빼고 셋째를 추가한다
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("[{\"id\":\"" + firstId + "\",\"version\":\"v1.0.1\",\"title\":\"첫 공개(수정)\",\"content\":\"처음\"},{\"version\":\"v2.0\",\"title\":\"큰 변화\",\"content\":\"새 기능\"}]"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.versions", hasSize(2)))
			.andExpect(jsonPath("$.data.versions[?(@.id=='" + firstId + "')].version", contains("v1.0.1")))
			.andExpect(jsonPath("$.data.versions[?(@.id=='" + firstId + "')].createdAt", contains("2026-01-01T00:00:00Z")));
		// 다른 서비스의 기록 id는 거절한다
		long otherId = createOk(other, "https://versions-other.example.test");
		mockMvc.perform(put("/api/services/" + otherId + "/versions").with(as(other, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("[{\"id\":\"" + firstId + "\",\"version\":\"x\",\"title\":\"x\",\"content\":\"x\"}]"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_10"));
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("[]"))
			.andExpect(jsonPath("$.data.versions", empty()));
		// 비어 있는 항목이 섞여 있어도 500이 아니라 400이다
		mockMvc.perform(put(path).with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("[null]"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SERVICE_400_10"));
	}

	@Test
	void urlCheckReportsFormatDuplicateUnreachableAndOk() throws Exception {
		long id = createOk(maker, "https://checked.example.test");
		String ok = "{\"url\":\"https://fresh.example.test\"}";
		mockMvc.perform(post("/api/services/url-check").with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(ok))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.state").value("OK"));
		mockMvc.perform(post("/api/services/url-check").with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"url\":\"http://plain.example.test\"}")).andExpect(jsonPath("$.data.state").value("FORMAT"));
		mockMvc.perform(post("/api/services/url-check").with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"url\":\"https://CHECKED.example.test/\"}")).andExpect(jsonPath("$.data.state").value("DUPLICATE"));
		// 수정 화면에서 자기 주소는 중복이 아니다
		mockMvc.perform(post("/api/services/url-check").with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"url\":\"https://checked.example.test\",\"selfId\":" + id + "}")).andExpect(jsonPath("$.data.state").value("OK"));
		when(probe.isReachable(anyString())).thenReturn(false);
		mockMvc.perform(post("/api/services/url-check").with(as(maker, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(ok))
			.andExpect(jsonPath("$.data.state").value("UNREACHABLE"));
	}

	@Test
	void mineListsOnlyMyServicesIncludingHiddenAndStopped() throws Exception {
		long first = createOk(maker, "https://mine1.example.test");
		long second = createOk(maker, "https://mine2.example.test");
		createOk(other, "https://notmine.example.test");
		jdbc.update("UPDATE services SET visibility_status = 'TEMP_HIDDEN', hidden_reason = '신고' WHERE service_id = ?", first);
		jdbc.update("UPDATE services SET availability_status = 'UNAVAILABLE', unavailable_reason = '점검' WHERE service_id = ?", second);
		jdbc.update("UPDATE services SET created_at = now() - interval '1 day' WHERE service_id = ?", first);
		em.clear();

		mockMvc.perform(get("/api/users/me/services").with(as(maker, "USER")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data", hasSize(2)))
			.andExpect(jsonPath("$.data[0].id").value(String.valueOf(second)))
			.andExpect(jsonPath("$.data[1].visibility").value("TEMP_HIDDEN"))
			.andExpect(jsonPath("$.data[1].hiddenReason").value("신고"));
		mockMvc.perform(get("/api/users/me/services")).andExpect(status().isUnauthorized());
	}


}

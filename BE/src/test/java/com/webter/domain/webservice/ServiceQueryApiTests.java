package com.webter.domain.webservice;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.security.SessionPrincipal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

// 서비스·카테고리 조회 API: 로그인 없이 조회, 필터·정렬·검색·집계, 비공개 서비스 접근을 확인한다. 각 테스트는 롤백된다.
class ServiceQueryApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	User owner;

	User fan;

	@BeforeEach
	void setUp() {
		// 시드 서비스가 있다면 영향이 없도록 이 테스트의 서비스만 비교한다(테스트 DB는 서비스가 비어 있다)
		owner = createUser("maker_one");
		fan = createUser("fan_one");
	}

	WebService service(String name, String url) {
		WebService s = createService(owner, url);
		jdbc.update("UPDATE services SET name = ?, tagline = ? WHERE service_id = ?", name, name + " 소개", s.getId());
		em.flush();
		return s;
	}

	void category(WebService s, String code, int order) {
		jdbc.update("INSERT INTO service_categories (service_id, category_id, sort_order) "
				+ "SELECT ?, category_id, ? FROM categories WHERE code = ?", s.getId(), order, code);
	}

	void tag(WebService s, String name, int order) {
		jdbc.update("INSERT INTO tags (name, normalized_name) VALUES (?, lower(?)) ON CONFLICT DO NOTHING", name, name);
		jdbc.update("INSERT INTO service_tags (service_id, tag_id, sort_order) "
				+ "SELECT ?, tag_id, ? FROM tags WHERE normalized_name = lower(?)", s.getId(), order, name);
	}

	void like(WebService s, User user, Instant at) {
		jdbc.update("INSERT INTO service_reactions (user_id, service_id, reaction_type, created_at) VALUES (?, ?, 'LIKE', ?)",
				user.getId(), s.getId(), java.sql.Timestamp.from(at));
	}

	void launch(WebService s, Instant at, boolean counted) {
		jdbc.update("INSERT INTO service_events (service_id, actor_key, event_type, is_counted, excluded_reason, occurred_at) "
				+ "VALUES (?, 'actor', 'LAUNCH', ?, ?, ?)", s.getId(), counted, counted ? null : "ABUSE",
				java.sql.Timestamp.from(at));
	}

	void view(WebService s) {
		jdbc.update("INSERT INTO service_events (service_id, actor_key, event_type) VALUES (?, 'actor', 'VIEW')", s.getId());
	}

	void review(WebService s, User author, String rating, String content) {
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content) VALUES (?, ?, 'MEMBER', ?, ?)",
				s.getId(), author.getId(), rating, content);
	}

	RequestPostProcessor loginAs(User user, String role) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(
				new SessionPrincipal.Member(user.getId()), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
	}

	@Test
	void categoriesAreListedInOrderWithoutLogin() throws Exception {
		mockMvc.perform(get("/api/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data", hasSize(8)))
			.andExpect(jsonPath("$.data[0].code").value("PLAY"))
			.andExpect(jsonPath("$.data[7].code").value("ETC"));
	}

	@Test
	void listAndDetailAreOpenWithoutLoginAndMutationsStillRequireIt() throws Exception {
		WebService s = service("공개 서비스", "https://open.example.test");
		flushAndClear();

		mockMvc.perform(get("/api/services")).andExpect(status().isOk());
		mockMvc.perform(get("/api/services/" + s.getId())).andExpect(status().isOk());
		// 서비스 하위 경로의 조회는 공개지만 쓰기는 로그인이 필요하다
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/services/" + s.getId() + "/likes"))
			.andExpect(status().isForbidden());
	}

	@Test
	void latestIsDefaultAndPagesByOffset() throws Exception {
		WebService first = service("첫째", "https://a.example.test");
		WebService second = service("둘째", "https://b.example.test");
		WebService third = service("셋째", "https://c.example.test");
		jdbc.update("UPDATE services SET created_at = ? WHERE service_id = ?", java.sql.Timestamp.from(Instant.now().minus(3, ChronoUnit.DAYS)), first.getId());
		jdbc.update("UPDATE services SET created_at = ? WHERE service_id = ?", java.sql.Timestamp.from(Instant.now().minus(2, ChronoUnit.DAYS)), second.getId());
		jdbc.update("UPDATE services SET created_at = ? WHERE service_id = ?", java.sql.Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)), third.getId());
		flushAndClear();

		mockMvc.perform(get("/api/services").param("size", "2"))
			.andExpect(jsonPath("$.data.total").value(3))
			.andExpect(jsonPath("$.data.items[*].name", contains("셋째", "둘째")));
		mockMvc.perform(get("/api/services").param("size", "2").param("page", "1"))
			.andExpect(jsonPath("$.data.items[*].name", contains("첫째")));
	}

	@Test
	void filtersOrWithinAGroupAndAndAcrossGroups() throws Exception {
		WebService game = service("게임", "https://game.example.test");
		category(game, "PLAY", 1);
		jdbc.update("UPDATE services SET price_type = 'PAID', device_codes = '[\"MOBILE\"]'::jsonb WHERE service_id = ?", game.getId());
		WebService tool = service("도구", "https://tool.example.test");
		category(tool, "DEV_TOOLS", 1);
		jdbc.update("UPDATE services SET availability_status = 'UNAVAILABLE', unavailable_reason = '점검 중' WHERE service_id = ?", tool.getId());
		flushAndClear();

		mockMvc.perform(get("/api/services").param("category", "PLAY", "DEV_TOOLS"))
			.andExpect(jsonPath("$.data.items[*].name", containsInAnyOrder("게임", "도구")));
		mockMvc.perform(get("/api/services").param("category", "PLAY"))
			.andExpect(jsonPath("$.data.items[*].name", contains("게임")));
		mockMvc.perform(get("/api/services").param("device", "MOBILE").param("price", "PAID"))
			.andExpect(jsonPath("$.data.items[*].name", contains("게임")));
		mockMvc.perform(get("/api/services").param("device", "MOBILE").param("price", "FREE"))
			.andExpect(jsonPath("$.data.items", empty()));
		mockMvc.perform(get("/api/services").param("availability", AvailabilityStatus.AVAILABLE.name()))
			.andExpect(jsonPath("$.data.items[*].name", contains("게임")));
		mockMvc.perform(get("/api/services").param("availability", "UNAVAILABLE"))
			.andExpect(jsonPath("$.data.items[0].unavailableReason").value("점검 중"));
	}

	@Test
	void invalidFilterValueIsRejected() throws Exception {
		mockMvc.perform(get("/api/services").param("price", "CHEAP")).andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/services").param("sort", "RELEVANCE")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("SERVICE_400_01"));
	}

	@Test
	void trendingUsesRecentThreeDaysAndPopularUsesChosenPeriod() throws Exception {
		Instant now = Instant.now();
		WebService recent = service("최근 인기", "https://recent.example.test");
		WebService old = service("과거 인기", "https://old.example.test");
		launch(recent, now.minus(1, ChronoUnit.DAYS), true);
		like(recent, fan, now.minus(1, ChronoUnit.DAYS));
		launch(old, now.minus(20, ChronoUnit.DAYS), true);
		launch(old, now.minus(20, ChronoUnit.DAYS), true);
		like(old, fan, now.minus(20, ChronoUnit.DAYS));
		like(old, owner, now.minus(20, ChronoUnit.DAYS));
		flushAndClear();

		// 최근 3일: 최근 인기 = 1 + 3, 과거 인기 = 0
		mockMvc.perform(get("/api/services").param("sort", "TRENDING"))
			.andExpect(jsonPath("$.data.items[*].name", contains("최근 인기", "과거 인기")));
		// 월간: 과거 인기 = 2 + 6 = 8이 최근 인기 4보다 크다. 주간에서는 과거 인기가 빠진다
		mockMvc.perform(get("/api/services").param("sort", "POPULAR").param("period", "MONTH"))
			.andExpect(jsonPath("$.data.items[*].name", contains("과거 인기", "최근 인기")));
		mockMvc.perform(get("/api/services").param("sort", "POPULAR").param("period", "WEEK"))
			.andExpect(jsonPath("$.data.items[0].name").value("최근 인기"));
		mockMvc.perform(get("/api/services").param("sort", "POPULAR"))
			.andExpect(jsonPath("$.data.items[0].name").value("과거 인기"));
	}

	@Test
	void searchMatchesNameTagsAndDescriptionAndRanksByRelevance() throws Exception {
		WebService byName = service("타이머 앱", "https://timer.example.test");
		WebService byTag = service("집중 도구", "https://focus.example.test");
		tag(byTag, "타이머", 1);
		WebService byDescription = service("공부 노트", "https://note.example.test");
		jdbc.update("UPDATE services SET description_markdown = '공부 시간을 재는 타이머 기능' WHERE service_id = ?", byDescription.getId());
		service("관계없음", "https://none.example.test");
		flushAndClear();

		// 이름 3점 > 태그 2점 > 설명 1점(소개 문구는 "<이름> 소개"라 설명 일치는 별도 확인)
		mockMvc.perform(get("/api/services").param("q", "타이머"))
			.andExpect(jsonPath("$.data.total").value(3))
			.andExpect(jsonPath("$.data.items[*].name", contains("타이머 앱", "집중 도구", "공부 노트")));
		mockMvc.perform(get("/api/services").param("q", "없는검색어")).andExpect(jsonPath("$.data.items", empty()));
		// 와일드카드 문자는 글자로 취급한다
		mockMvc.perform(get("/api/services").param("q", "%")).andExpect(jsonPath("$.data.items", empty()));
	}

	@Test
	void aggregatesComeFromRecordedActivity() throws Exception {
		WebService s = service("집계 서비스", "https://agg.example.test");
		Instant now = Instant.now();
		view(s);
		view(s);
		launch(s, now, true);
		launch(s, now, false);
		like(s, fan, now.minus(10, ChronoUnit.DAYS));
		jdbc.update("INSERT INTO service_reactions (user_id, service_id, reaction_type, created_at) VALUES (?, ?, 'SAVE', ?)",
				fan.getId(), s.getId(), java.sql.Timestamp.from(now.minus(1, ChronoUnit.DAYS)));
		User other = createUser("reviewer_one");
		em.flush();
		review(s, fan, "RECOMMEND", "좋아요");
		review(s, other, "NOT_RECOMMEND", "별로");
		// 제작자 리뷰는 평가에 넣지 않는다
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content, is_creator_review) VALUES (?, ?, 'MEMBER', 'NONE', '제작 후기', TRUE)",
				s.getId(), owner.getId());
		flushAndClear();

		mockMvc.perform(get("/api/services/" + s.getId()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.views").value(2))
			// 집계에서 제외된 클릭은 세지 않는다
			.andExpect(jsonPath("$.data.clicks").value(1))
			.andExpect(jsonPath("$.data.likes").value(1))
			.andExpect(jsonPath("$.data.saves").value(1))
			.andExpect(jsonPath("$.data.reviews.up").value(1))
			.andExpect(jsonPath("$.data.reviews.down").value(1))
			.andExpect(jsonPath("$.data.reviews.none").value(0))
			// 3일 점수: 저장 5 + 클릭 1 = 6, 주간: 6, 월간: 6 + 좋아요 3 = 9
			.andExpect(jsonPath("$.data.scores.threeDays").value(6))
			.andExpect(jsonPath("$.data.scores.week").value(6))
			.andExpect(jsonPath("$.data.scores.month").value(9))
			.andExpect(jsonPath("$.data.owner.username").value("maker_one"))
			.andExpect(jsonPath("$.data.owner.email").doesNotExist());
	}

	@Test
	void detailIncludesCategoriesTagsAndVersions() throws Exception {
		WebService s = service("상세 서비스", "https://detail.example.test");
		category(s, "PLAY", 1);
		category(s, "ETC", 2);
		tag(s, "게임", 1);
		jdbc.update("INSERT INTO service_versions (service_id, version, title, content) VALUES (?, 'v1.0', '첫 공개', '처음 공개했어요')", s.getId());
		flushAndClear();

		mockMvc.perform(get("/api/services/" + s.getId()))
			.andExpect(jsonPath("$.data.categories", contains("PLAY", "ETC")))
			.andExpect(jsonPath("$.data.tags", contains("게임")))
			.andExpect(jsonPath("$.data.versions[0].version").value("v1.0"))
			.andExpect(jsonPath("$.data.projectType").value("SIDE"))
			.andExpect(jsonPath("$.data.priceType").value(PriceType.FREE.name()))
			.andExpect(jsonPath("$.data.devices", contains(DeviceCode.PC.name())));
	}

	@Test
	void hiddenServiceIsVisibleOnlyToOwnerAndAdmin() throws Exception {
		WebService s = service("숨김 서비스", "https://hidden.example.test");
		jdbc.update("UPDATE services SET visibility_status = 'TEMP_HIDDEN', hidden_reason = '신고 누적' WHERE service_id = ?", s.getId());
		flushAndClear();

		// 목록에는 나오지 않고, 남에게는 상세도 없는 것처럼 보인다
		mockMvc.perform(get("/api/services")).andExpect(jsonPath("$.data.items", empty()));
		mockMvc.perform(get("/api/services/" + s.getId())).andExpect(status().isNotFound());
		mockMvc.perform(get("/api/services/" + s.getId()).with(loginAs(fan, "USER"))).andExpect(status().isNotFound());
		mockMvc.perform(get("/api/services/" + s.getId()).with(loginAs(owner, "USER")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.visibility").value("TEMP_HIDDEN"))
			.andExpect(jsonPath("$.data.hiddenReason").value("신고 누적"));
		mockMvc.perform(get("/api/services/" + s.getId()).with(loginAs(fan, "ADMIN"))).andExpect(status().isOk());
	}

	@Test
	void unknownServiceIsNotFoundAndHiddenReasonIsNotExposedToOthers() throws Exception {
		mockMvc.perform(get("/api/services/999999")).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("SERVICE_404_01"));
		WebService s = service("공개 서비스", "https://visible.example.test");
		jdbc.update("UPDATE services SET hidden_reason = '내부 메모' WHERE service_id = ?", s.getId());
		flushAndClear();
		mockMvc.perform(get("/api/services/" + s.getId())).andExpect(jsonPath("$.data.hiddenReason", nullValue()));
	}

}

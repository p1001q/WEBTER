package com.webter.domain.user;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

// 제작자 프로필(공개)과 마이페이지의 저장한 서비스·내 리뷰·내 댓글을 확인한다. 각 테스트는 롤백된다.
class UserActivityApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	User maker;

	User fan;

	WebService open;

	@BeforeEach
	void setUp() {
		maker = createUser("maker_three");
		fan = createUser("fan_three");
		em.flush();
		jdbc.update("UPDATE users SET bio = '작은 도구를 만들어요', profile_links = '{\"github\":\"https://github.com/maker\",\"blog\":\"https://blog.example.test\"}'::jsonb, email = 'secret@example.test' WHERE user_id = ?",
				maker.getId());
		open = service(maker, "공개 서비스", "https://profile-open.example.test");
	}

	WebService service(User owner, String name, String url) {
		WebService s = createService(owner, url);
		jdbc.update("UPDATE services SET name = ? WHERE service_id = ?", name, s.getId());
		em.flush();
		return s;
	}

	RequestPostProcessor as(User user) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(
				new SessionPrincipal.Member(user.getId()), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
	}

	void react(User user, WebService s, String type, String at) {
		jdbc.update("INSERT INTO service_reactions (user_id, service_id, reaction_type, created_at) VALUES (?, ?, ?, ?::timestamptz)",
				user.getId(), s.getId(), type, at);
	}

	@Test
	void publicProfileShowsOnlyPublicInformationAndPublicTotals() throws Exception {
		WebService hidden = service(maker, "숨김 서비스", "https://profile-hidden.example.test");
		jdbc.update("UPDATE services SET visibility_status = 'TEMP_HIDDEN' WHERE service_id = ?", hidden.getId());
		react(fan, open, "LIKE", "2026-11-10T00:00:00Z");
		react(fan, hidden, "LIKE", "2026-11-10T00:00:00Z");
		react(fan, open, "SAVE", "2026-11-10T00:00:00Z");
		em.clear();

		mockMvc.perform(get("/api/users/" + maker.getId()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.username").value("maker_three"))
			.andExpect(jsonPath("$.data.bio").value("작은 도구를 만들어요"))
			.andExpect(jsonPath("$.data.links[*].kind", contains("blog", "github")))
			// 공개된 서비스 1개, 공개된 서비스가 받은 좋아요 1개만 센다(저장은 센 값이 아니다)
			.andExpect(jsonPath("$.data.serviceCount").value(1))
			.andExpect(jsonPath("$.data.receivedLikes").value(1))
			.andExpect(jsonPath("$.data.email").doesNotExist());
	}

	@Test
	void unknownInvalidOrHiddenUsersAreNotFoundAndMeIsNotPublic() throws Exception {
		mockMvc.perform(get("/api/users/" + UUID.randomUUID())).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("USER_404_01"));
		jdbc.update("UPDATE users SET visibility_status = 'TEMP_HIDDEN' WHERE user_id = ?", fan.getId());
		em.clear();
		mockMvc.perform(get("/api/users/" + fan.getId())).andExpect(status().isNotFound());
		// 유효하지 않은 아이디와 me는 공개 프로필 경로가 아니다
		mockMvc.perform(get("/api/users/not-a-uuid")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/users/me/saved")).andExpect(status().isUnauthorized());
	}

	@Test
	void savedServicesAreListedInSavedOrderIncludingHiddenOnes() throws Exception {
		WebService second = service(maker, "둘째", "https://saved2.example.test");
		WebService hidden = service(maker, "숨김", "https://saved3.example.test");
		jdbc.update("UPDATE services SET visibility_status = 'TEMP_HIDDEN' WHERE service_id = ?", hidden.getId());
		react(fan, second, "SAVE", "2026-11-10T01:00:00Z");
		react(fan, open, "SAVE", "2026-11-10T02:00:00Z");
		react(fan, hidden, "SAVE", "2026-11-10T03:00:00Z");
		react(fan, open, "LIKE", "2026-11-10T00:00:00Z");
		react(maker, open, "SAVE", "2026-11-10T00:30:00Z");
		em.clear();

		mockMvc.perform(get("/api/users/me/liked").with(as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data", contains(String.valueOf(open.getId()))));
		mockMvc.perform(get("/api/users/me/saved").with(as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[*].serviceId", contains(String.valueOf(second.getId()),
					String.valueOf(open.getId()), String.valueOf(hidden.getId()))))
			.andExpect(jsonPath("$.data", hasSize(3)));
	}

	@Test
	void myReviewsAndCommentsListOnlyMyPublicWritingOnPublicServices() throws Exception {
		WebService hidden = service(maker, "숨김", "https://mine-hidden.example.test");
		jdbc.update("UPDATE services SET visibility_status = 'TEMP_HIDDEN' WHERE service_id = ?", hidden.getId());
		WebService other = service(maker, "다른 서비스", "https://mine-other.example.test");
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content, created_at) VALUES (?, ?, 'MEMBER', 'RECOMMEND', '첫 리뷰', '2026-11-10T01:00:00Z')", open.getId(), fan.getId());
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content, created_at) VALUES (?, ?, 'MEMBER', 'NOT_RECOMMEND', '둘째 리뷰', '2026-11-10T02:00:00Z')", other.getId(), fan.getId());
		// 글 없는 단독 평가, 숨겨진 서비스의 리뷰, 다른 사람의 리뷰는 나오지 않는다
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content) VALUES (?, ?, 'MEMBER', 'RECOMMEND', '')", hidden.getId(), fan.getId());
		jdbc.update("INSERT INTO reviews (service_id, author_id, author_kind, rating, content) VALUES (?, ?, 'MEMBER', 'RECOMMEND', '남의 리뷰')", open.getId(), maker.getId());
		jdbc.update("INSERT INTO service_comments (service_id, author_id, content, created_at) VALUES (?, ?, '내 댓글', '2026-11-10T01:00:00Z')", open.getId(), fan.getId());
		jdbc.update("INSERT INTO service_comments (service_id, author_id, content, created_at) VALUES (?, ?, '숨겨진 서비스의 댓글', '2026-11-10T02:00:00Z')", hidden.getId(), fan.getId());
		jdbc.update("INSERT INTO service_comments (service_id, author_id, content) VALUES (?, ?, '남의 댓글')", open.getId(), maker.getId());
		em.clear();

		mockMvc.perform(get("/api/users/me/reviews").with(as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[*].text", contains("둘째 리뷰", "첫 리뷰")))
			.andExpect(jsonPath("$.data[0].sid").value(String.valueOf(other.getId())))
			.andExpect(jsonPath("$.data[0].mine").value(true));
		mockMvc.perform(get("/api/users/me/comments").with(as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[*].text", contains("내 댓글")))
			.andExpect(jsonPath("$.data[0].mine").value(true));
		mockMvc.perform(get("/api/users/me/reviews").with(as(maker)))
			.andExpect(jsonPath("$.data[*].text", contains("남의 리뷰")));
		mockMvc.perform(get("/api/users/me/reviews").with(as(fan)).param("limit", "1"))
			.andExpect(jsonPath("$.data", hasSize(1)));
		mockMvc.perform(get("/api/users/me/reviews").with(as(fan)).param("limit", "0")).andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/users/me/comments").with(as(fan)).param("limit", "101")).andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/users/me/reviews")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/users/me/comments").with(as(createUserFlushed("nobody_three"))))
			.andExpect(jsonPath("$.data", empty()));
	}

	User createUserFlushed(String name) {
		User u = createUser(name);
		em.flush();
		return u;
	}

}

package com.webter.domain.user;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

class UserSearchApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	@BeforeEach
	void setUp() {
		member("qa_search", "바다", "작은 도구를 만들어요");
		member("qa_search_more", "바다", "");
		member("a_qa_search", "다른 이름", "");
	}

	void member(String username, String nickname, String bio) {
		userRepository.save(User.builder().username(username).nickname(nickname).bio(bio)
			.email("private@example.test").build());
		em.flush();
	}

	@Test
	void guestsCanSearchUsernameWithOrWithoutAtAndIgnoreCase() throws Exception {
		for (String q : new String[]{"qa_search", "@qa_search", "  @QA_SEARCH  "}) {
			mockMvc.perform(get("/api/users/search").param("q", q))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.items[*].username", contains("qa_search", "qa_search_more", "a_qa_search")))
				.andExpect(jsonPath("$.data.total").value(3))
				.andExpect(jsonPath("$.data.items[0].bio").value("작은 도구를 만들어요"))
				.andExpect(jsonPath("$.data.items[0].email").doesNotExist())
				.andExpect(jsonPath("$.data.items[0].role").doesNotExist());
		}
		mockMvc.perform(get("/api/users/me/saved")).andExpect(status().isUnauthorized());
	}

	@Test
	void nicknameSearchFindsMultipleMembersAndPartialMatches() throws Exception {
		mockMvc.perform(get("/api/users/search").param("q", "바다"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[*].username", contains("qa_search", "qa_search_more")));
		mockMvc.perform(get("/api/users/search").param("q", "른 이"))
			.andExpect(jsonPath("$.data.items[*].username", contains("a_qa_search")));
	}

	@Test
	void exactNicknamePrecedesPrefixUsernameAndPaginationIsStable() throws Exception {
		member("z_sea", "qa_search", "");
		mockMvc.perform(get("/api/users/search").param("q", "qa_search").param("size", "2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[*].username", contains("qa_search", "z_sea")))
			.andExpect(jsonPath("$.data.total").value(4));
		mockMvc.perform(get("/api/users/search").param("q", "qa_search").param("size", "2").param("page", "1"))
			.andExpect(jsonPath("$.data.items[*].username", contains("qa_search_more", "a_qa_search")))
			.andExpect(jsonPath("$.data.page").value(1));
		mockMvc.perform(get("/api/users/search").param("q", "qa_search").param("page", "10"))
			.andExpect(jsonPath("$.data.items", empty()));
	}

	@Test
	void hiddenSuspendedAndWithdrawnMembersAreNotDiscovered() throws Exception {
		jdbc.update("UPDATE users SET visibility_status = 'TEMP_HIDDEN' WHERE username = 'qa_search_more'");
		jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE username = 'a_qa_search'");
		member("qa_search_gone", "바다", "");
		jdbc.update("DELETE FROM users WHERE username = 'qa_search_gone'");
		em.clear();
		mockMvc.perform(get("/api/users/search").param("q", "qa_search"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[*].username", contains("qa_search")))
			.andExpect(jsonPath("$.data.total").value(1));
		mockMvc.perform(get("/api/users/search").param("q", "바다"))
			.andExpect(jsonPath("$.data.items", hasSize(1)));
	}

	@Test
	void sqlWildcardsAreTreatedAsLiteralText() throws Exception {
		member("qaXsearch", "별도 이름", "");
		mockMvc.perform(get("/api/users/search").param("q", "qa_search"))
			.andExpect(jsonPath("$.data.total").value(3));
		mockMvc.perform(get("/api/users/search").param("q", "%"))
			.andExpect(jsonPath("$.data.items", empty()));
		mockMvc.perform(get("/api/users/search").param("q", "' OR 1=1 --"))
			.andExpect(jsonPath("$.data.items", empty()));
	}

	@Test
	void blankSearchDoesNotListEveryoneAndInvalidPaginationIsRejected() throws Exception {
		for (String q : new String[]{"", " ", "@", " @ "}) {
			mockMvc.perform(get("/api/users/search").param("q", q))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.items", empty()))
				.andExpect(jsonPath("$.data.total").value(0));
		}
		mockMvc.perform(get("/api/users/search").param("q", "x".repeat(101)))
			.andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/users/search").param("page", "-1")).andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/users/search").param("size", "0")).andExpect(status().isBadRequest());
		mockMvc.perform(get("/api/users/search").param("size", "101")).andExpect(status().isBadRequest());
	}

}

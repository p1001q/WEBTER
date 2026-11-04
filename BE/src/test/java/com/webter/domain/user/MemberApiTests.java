package com.webter.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.domain.reaction.entity.ReactionType;
import com.webter.domain.reaction.entity.ServiceReaction;
import com.webter.domain.reaction.repository.ServiceReactionRepository;
import com.webter.domain.review.entity.AuthorKind;
import com.webter.domain.review.entity.Review;
import com.webter.domain.review.entity.ReviewRating;
import com.webter.domain.review.repository.ReviewRepository;
import com.webter.domain.user.entity.OAuthIdentity;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserConsent;
import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.repository.OAuthIdentityRepository;
import com.webter.domain.user.repository.UserConsentRepository;
import com.webter.domain.user.repository.UserInterestRepository;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

// 가입을 마친 회원의 계정 설정 수정과 탈퇴. 각 테스트는 롤백된다.
class MemberApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	OAuthIdentityRepository identityRepository;

	@Autowired
	UserConsentRepository consentRepository;

	@Autowired
	UserInterestRepository interestRepository;

	@Autowired
	CategoryRepository categoryRepository;

	@Autowired
	ReviewRepository reviewRepository;

	@Autowired
	ServiceReactionRepository reactionRepository;

	@Autowired
	PolicyDocumentRepository policyRepository;

	static Authentication member(User user) {
		return AuthApiTests.auth(new SessionPrincipal.Member(user.getId()), "ROLE_USER");
	}

	static String profile(String username, String nickname, String bio, String links, String interests) {
		return """
				{"username":"%s","nickname":"%s","bio":%s,"links":%s,"interests":%s}"""
			.formatted(username, nickname, bio, links, interests);
	}

	RequestPostProcessor as(User user) {
		return authentication(member(user));
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	@Test
	void updatesProfileAndReplacesInterests() throws Exception {
		User user = createUser("before");
		interestRepository.save(UserInterest.builder()
			.user(user)
			.category(categoryRepository.findByCodeInAndActiveTrue(List.of("PLAY")).get(0))
			.sortOrder((short) 1)
			.build());
		flushAndClear();

		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("After.01", "새 닉네임", "\"한 줄 소개\"",
					"[{\"kind\":\"github\",\"url\":\"github.com/after\"},{\"kind\":\"blog\",\"url\":\"http://blog.example.com/x\"}]",
					"[\"DEV_TOOLS\",\"LIFE\"]")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.username").value("After.01"))
			.andExpect(jsonPath("$.data.nickname").value("새 닉네임"))
			.andExpect(jsonPath("$.data.bio").value("한 줄 소개"))
			.andExpect(jsonPath("$.data.links[?(@.kind=='github')].url").value("https://github.com/after"))
			.andExpect(jsonPath("$.data.links[?(@.kind=='blog')].url").value("http://blog.example.com/x"))
			.andExpect(jsonPath("$.data.interests[0]").value("DEV_TOOLS"));

		flushAndClear();
		assertThat(jdbc.queryForObject("SELECT username FROM users WHERE user_id = ?", String.class, user.getId()))
			.isEqualTo("After.01");
		assertThat(jdbc.queryForList("""
				SELECT c.code FROM user_interests i JOIN categories c USING (category_id)
				WHERE i.user_id = ? ORDER BY i.sort_order""", String.class, user.getId()))
			.containsExactly("DEV_TOOLS", "LIFE");
		mockMvc.perform(get("/api/auth/session").with(as(user)))
			.andExpect(jsonPath("$.data.member.nickname").value("새 닉네임"))
			.andExpect(jsonPath("$.data.member.bio").value("한 줄 소개"));
	}

	@Test
	void profileNicknameUsesWeightedLengthAndAllowsOneCharacter() throws Exception {
		User user = createUser("nickedit");
		for (String nickname : List.of("가", "a", "사과먹는개발자님", "a".repeat(16), "가나다라abcdefgh")) {
			mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(profile("nickedit", nickname, "\"\"", "[]", "[]")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nickname").value(nickname));
		}
		flushAndClear();
		assertThat(jdbc.queryForObject("SELECT nickname FROM users WHERE user_id = ?", String.class, user.getId()))
			.isEqualTo("가나다라abcdefgh");

		for (String nickname : List.of("사과먹는 개발자님", "가".repeat(9), "a".repeat(17), " 앞", "뒤 ", "두  칸", "ㅋㅋ",
				"개발ㅋㅋ", "기호!", "이모지😀")) {
			mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(profile("nickedit", nickname, "\"\"", "[]", "[]")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.data.nickname").exists());
		}
		flushAndClear();
		assertThat(jdbc.queryForObject("SELECT nickname FROM users WHERE user_id = ?", String.class, user.getId()))
			.isEqualTo("가나다라abcdefgh");
	}

	@Test
	void clearingOptionalFieldsIsAllowed() throws Exception {
		User user = createUser("clearme");
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("clearme", "비움", "null", "[]", "[]")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.bio").value(""))
			.andExpect(jsonPath("$.data.links").isEmpty())
			.andExpect(jsonPath("$.data.interests").isEmpty());
	}

	@Test
	void usernameMustBeUniqueButCaseOnlyChangeOfOwnIsFine() throws Exception {
		User user = createUser("mine_id");
		createUser("taken_id");
		flushAndClear();

		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("TAKEN_ID", "닉네임", "\"\"", "[]", "[]")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_409_01"));
		assertThat(jdbc.queryForObject("SELECT username FROM users WHERE user_id = ?", String.class, user.getId()))
			.isEqualTo("mine_id");

		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("Mine_ID", "닉네임", "\"\"", "[]", "[]")))
			.andExpect(status().isOk());
	}

	@Test
	void invalidLinksAreRejected() throws Exception {
		User user = createUser("linker");
		flushAndClear();
		for (String links : List.of("[{\"kind\":\"github\",\"url\":\"javascript:alert(1)\"}]",
				"[{\"kind\":\"github\",\"url\":\"ftp://example.com/x\"}]",
				"[{\"kind\":\"github\",\"url\":\"has space.com\"}]",
				"[{\"kind\":\"blog\",\"url\":\"a.example.com\"},{\"kind\":\"blog\",\"url\":\"b.example.com\"}]")) {
			mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(profile("linker", "닉네임", "\"\"", links, "[]")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("USER_400_03"));
		}
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("linker", "닉네임", "\"\"", "[{\"kind\":\"twitter\",\"url\":\"x.com/a\"}]", "[]")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_400_01"));
		assertThat(jdbc.queryForObject("SELECT profile_links::text FROM users WHERE user_id = ?", String.class,
				user.getId())).isEqualTo("{}");
	}

	@Test
	void linkLimitIncludesAddedHttpsScheme() throws Exception {
		User user = createUser("link_limit");
		String address = "https://example.com/" + "a".repeat(300 - "https://example.com/".length());
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("link_limit", "닉네임", "\"\"",
					"[{\"kind\":\"portfolio\",\"url\":\"" + address + "\"}]", "[]")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.links[0].url").value(address));

		// 원문은 300자 이하여도 https:// 보완 후 301자면 거절한다.
		String withoutScheme = address.substring("https://".length()) + "b";
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("link_limit", "닉네임", "\"\"",
					"[{\"kind\":\"portfolio\",\"url\":\"" + withoutScheme + "\"}]", "[]")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("USER_400_03"));
		assertThat(jdbc.queryForObject("SELECT profile_links ->> 'portfolio' FROM users WHERE user_id = ?",
				String.class, user.getId())).isEqualTo(address);
	}

	@Test
	void fieldFormatsAndLimitsAreValidated() throws Exception {
		User user = createUser("limits");
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("x", "!", "\"" + "가".repeat(81) + "\"", "[]", "[\"PLAY\",\"LIFE\",\"LEARNING\",\"DESIGN\"]")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.data.username").exists())
			.andExpect(jsonPath("$.data.nickname").exists())
			.andExpect(jsonPath("$.data.bio").exists())
			.andExpect(jsonPath("$.data.interests").exists());
		mockMvc.perform(put("/api/users/me").with(as(user)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("limits", "닉네임", "\"\"", "[]", "[\"NOPE\"]")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("USER_400_02"));
	}

	@Test
	void onlySignedUpMembersWithCsrfCanChangeOrWithdraw() throws Exception {
		User user = createUser("guarded");
		flushAndClear();
		String body = profile("guarded", "닉네임", "\"\"", "[]", "[]");
		mockMvc.perform(put("/api/users/me").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(delete("/api/users/me").with(csrf())).andExpect(status().isUnauthorized());
		mockMvc.perform(put("/api/users/me").with(AuthApiTests.pending("sub-guard"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body)).andExpect(status().isForbidden());
		mockMvc.perform(delete("/api/users/me").with(AuthApiTests.pending("sub-guard")).with(csrf()))
			.andExpect(status().isForbidden());
		mockMvc.perform(put("/api/users/me").with(as(user)).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isForbidden());
		mockMvc.perform(delete("/api/users/me").with(as(user))).andExpect(status().isForbidden());
		assertThat(count("SELECT count(*) FROM users WHERE user_id = ?", user.getId())).isEqualTo(1);
	}

	@Test
	void withdrawalDeletesOwnDataAndKeepsReviewsWithoutAuthor() throws Exception {
		User leaver = createUser("leaver");
		User other = createUser("stayer");
		WebService mine = createService(leaver, "https://example.com/leaver-service");
		WebService theirs = createService(other, "https://example.com/stayer-service");
		Review review = reviewRepository.save(Review.builder()
			.webService(theirs)
			.author(leaver)
			.authorKind(AuthorKind.MEMBER)
			.rating(ReviewRating.RECOMMEND)
			.content("남기고 가는 리뷰")
			.build());
		reactionRepository.save(new ServiceReaction(leaver, theirs, ReactionType.LIKE));
		reactionRepository.save(new ServiceReaction(leaver, theirs, ReactionType.SAVE));
		reactionRepository.save(new ServiceReaction(other, theirs, ReactionType.LIKE));
		identityRepository.save(OAuthIdentity.builder().user(leaver).providerSubject("leaver-sub").build());
		consentRepository.save(UserConsent.builder()
			.user(leaver)
			.policyDocument(policyRepository.findByDocumentTypeAndVersion(DocumentType.TERMS, "draft-1").orElseThrow())
			.build());
		flushAndClear();

		var session = new MockHttpSession();
		mockMvc.perform(delete("/api/users/me").session(session).with(as(leaver)).with(csrf()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		flushAndClear();
		assertThat(session.isInvalid()).isTrue();
		assertThat(count("SELECT count(*) FROM users WHERE user_id = ?", leaver.getId())).isZero();
		assertThat(count("SELECT count(*) FROM services WHERE service_id = ?", mine.getId())).isZero();
		assertThat(count("SELECT count(*) FROM oauth_identities WHERE provider_subject = 'leaver-sub'")).isZero();
		assertThat(count("SELECT count(*) FROM user_consents WHERE user_id = ?", leaver.getId())).isZero();
		assertThat(count("SELECT count(*) FROM service_reactions WHERE user_id = ?", leaver.getId())).isZero();
		// 리뷰는 남고 작성자만 비워진다("탈퇴한 사용자"로 표시)
		assertThat(jdbc.queryForObject("SELECT content FROM reviews WHERE review_id = ?", String.class, review.getId()))
			.isEqualTo("남기고 가는 리뷰");
		assertThat(jdbc.queryForObject("SELECT author_id FROM reviews WHERE review_id = ?", Object.class,
				review.getId())).isNull();
		// 다른 회원의 서비스·반응은 그대로다
		assertThat(count("SELECT count(*) FROM services WHERE service_id = ?", theirs.getId())).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM service_reactions WHERE user_id = ?", other.getId())).isEqualTo(1);
	}

	@Test
	void staleSessionAfterWithdrawalIsNoLongerLoggedIn() throws Exception {
		User leaver = createUser("stale");
		flushAndClear();
		mockMvc.perform(delete("/api/users/me").with(as(leaver)).with(csrf())).andExpect(status().isOk());

		// 다른 기기에 남아 있던 같은 회원의 세션
		mockMvc.perform(get("/api/auth/session").with(as(leaver)))
			.andExpect(jsonPath("$.data.status").value("ANONYMOUS"));
		mockMvc.perform(put("/api/users/me").with(as(leaver)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(profile("stale", "닉네임", "\"\"", "[]", "[]")))
			.andExpect(status().isUnauthorized());
		mockMvc.perform(delete("/api/users/me").with(as(leaver)).with(csrf())).andExpect(status().isUnauthorized());
	}

}

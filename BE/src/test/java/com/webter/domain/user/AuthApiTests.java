package com.webter.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.IntegrationTest;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

// 로그인 상태 조회, 가입 완료(온보딩 최종 제출), 권한 경계를 확인한다. 각 테스트는 롤백된다.
@Transactional
class AuthApiTests extends IntegrationTest {

	private static final String SIGNUP_BODY = """
			{"username":"%s","nickname":"%s","interests":%s,"consents":%s}""";

	private static final String CONSENTS = """
			[{"documentType":"TERMS","version":"draft-1"},
			 {"documentType":"PRIVACY","version":"draft-1"},
			 {"documentType":"AGE_CONFIRMATION","version":"draft-1"}]""";

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	PolicyDocumentRepository policyDocumentRepository;

	static RequestPostProcessor pending(String subject) {
		return authentication(auth(new SessionPrincipal.PendingSignup(subject, subject + "@example.test"),
				"ROLE_SIGNUP_PENDING"));
	}

	static Authentication auth(SessionPrincipal principal, String role) {
		return UsernamePasswordAuthenticationToken.authenticated(principal, null,
				List.of(new SimpleGrantedAuthority(role)));
	}

	static String body(String username, String nickname, String interests, String consents) {
		return SIGNUP_BODY.formatted(username, nickname, interests, consents);
	}

	int count(String table) {
		return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class);
	}

	@Test
	void anonymousSession() throws Exception {
		mockMvc.perform(get("/api/auth/session"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("ANONYMOUS"))
			.andExpect(jsonPath("$.data.member").isEmpty());
	}

	@Test
	void csrfTokenIsIssuedWithoutLogin() throws Exception {
		mockMvc.perform(get("/api/auth/csrf"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.headerName").value("X-CSRF-TOKEN"))
			.andExpect(jsonPath("$.data.token").isNotEmpty());
	}

	@Test
	void currentPoliciesArePublic() throws Exception {
		mockMvc.perform(get("/api/policies/current"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[?(@.documentType=='TERMS')].version").value("draft-1"))
			.andExpect(jsonPath("$.data[?(@.documentType=='PRIVACY')].version").value("draft-1"))
			.andExpect(jsonPath("$.data[?(@.documentType=='AGE_CONFIRMATION')].version").value("draft-1"));
	}

	@Test
	void googleLoginIsUnavailableUntilConfigured() throws Exception {
		mockMvc.perform(get("/api/auth/login/google"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.code").value("AUTH_503_01"));
	}

	@Test
	void signupRequiresPendingSignupSession() throws Exception {
		String content = body("alice", "앨리스", "[]", CONSENTS);
		mockMvc.perform(post("/api/auth/signup").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(content))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("COMMON_401_01"));
		var member = authentication(auth(new SessionPrincipal.Member(java.util.UUID.randomUUID()), "ROLE_USER"));
		mockMvc.perform(post("/api/auth/signup").with(member).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(content)).andExpect(status().isForbidden());
		assertThat(count("users")).isZero();
	}

	@Test
	void signupWithoutCsrfTokenIsRejected() throws Exception {
		mockMvc.perform(post("/api/auth/signup").with(pending("sub-csrf"))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("alice", "앨리스", "[]", CONSENTS))).andExpect(status().isForbidden());
		assertThat(count("users")).isZero();
	}

	@Test
	void pendingUserCannotUseMemberApis() throws Exception {
		mockMvc.perform(get("/api/anything").with(pending("sub-pending"))).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/anything")).andExpect(status().isUnauthorized());
	}

	@Test
	void signupSavesEverythingAndLogsIn() throws Exception {
		var session = new MockHttpSession();
		mockMvc.perform(get("/api/auth/session").session(session).with(pending("sub-ok")))
			.andExpect(jsonPath("$.data.status").value("SIGNUP_PENDING"))
			.andExpect(jsonPath("$.data.pending.email").value("sub-ok@example.test"));

		var result = mockMvc.perform(post("/api/auth/signup").session(session)
			.with(pending("sub-ok"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("Alice.01", "앨리스 Kim", "[\"DEV_TOOLS\",\"PLAY\"]", CONSENTS)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.status").value("MEMBER"))
			.andExpect(jsonPath("$.data.member.username").value("Alice.01"))
			.andExpect(jsonPath("$.data.member.role").value("USER"))
			.andReturn();

		assertThat(count("users")).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT provider_subject FROM oauth_identities", String.class))
			.isEqualTo("sub-ok");
		assertThat(count("user_consents")).isEqualTo(3);
		assertThat(jdbc.queryForList("""
				SELECT c.code FROM user_interests i JOIN categories c USING (category_id) ORDER BY i.sort_order""",
				String.class)).containsExactly("DEV_TOOLS", "PLAY");
		assertThat(jdbc.queryForObject("SELECT email FROM users", String.class)).isEqualTo("sub-ok@example.test");

		// 같은 세션이 이제 회원 로그인 상태다(구글 인증 정보는 더 이상 쓰이지 않는다)
		var after = (MockHttpSession) result.getRequest().getSession();
		mockMvc.perform(get("/api/auth/session").session(after))
			.andExpect(jsonPath("$.data.status").value("MEMBER"))
			.andExpect(jsonPath("$.data.member.nickname").value("앨리스 Kim"))
			.andExpect(jsonPath("$.data.member.interests[0]").value("DEV_TOOLS"));
		mockMvc.perform(get("/api/anything").session(after)).andExpect(status().isNotFound());
	}

	@Test
	void signupWithoutInterestsIsAllowed() throws Exception {
		mockMvc.perform(post("/api/auth/signup").with(pending("sub-skip"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("skipper", "건너뜀", "[]", CONSENTS))).andExpect(status().isCreated());
		assertThat(count("user_interests")).isZero();
	}

	@Test
	void duplicateUsernameIgnoringCaseIsConflictAndStoresNothing() throws Exception {
		signupOk("first-sub", "taken_id");
		int users = count("users");
		mockMvc.perform(post("/api/auth/signup").with(pending("second-sub"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("TAKEN_ID", "다른 사람", "[]", CONSENTS)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_409_01"));
		assertThat(count("users")).isEqualTo(users);
		assertThat(count("oauth_identities")).isEqualTo(1);
	}

	@Test
	void alreadyRegisteredGoogleAccountIsConflict() throws Exception {
		signupOk("same-sub", "first_name");
		mockMvc.perform(post("/api/auth/signup").with(pending("same-sub"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("second_name", "두번째", "[]", CONSENTS)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_409_02"));
		assertThat(count("users")).isEqualTo(1);
	}

	@Test
	void requiredConsentsMustAllBeCurrent() throws Exception {
		String missingAge = """
				[{"documentType":"TERMS","version":"draft-1"},{"documentType":"PRIVACY","version":"draft-1"}]""";
		String duplicated = """
				[{"documentType":"TERMS","version":"draft-1"},{"documentType":"TERMS","version":"draft-1"},
				 {"documentType":"PRIVACY","version":"draft-1"},{"documentType":"AGE_CONFIRMATION","version":"draft-1"}]""";
		String notForSignup = """
				[{"documentType":"TERMS","version":"draft-1"},{"documentType":"PRIVACY","version":"draft-1"},
				 {"documentType":"AGE_CONFIRMATION","version":"draft-1"},
				 {"documentType":"SERVICE_REGISTRATION","version":"draft-1"}]""";
		for (String consents : List.of("[]", missingAge, duplicated, notForSignup)) {
			mockMvc.perform(post("/api/auth/signup").with(pending("sub-consent"))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("consent_user", "동의", "[]", consents)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("USER_400_01"));
		}
		String oldVersion = CONSENTS.replaceFirst("draft-1", "draft-0");
		mockMvc.perform(post("/api/auth/signup").with(pending("sub-consent"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("consent_user", "동의", "[]", oldVersion)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_409_03"));
		assertThat(count("users")).isZero();
		assertThat(count("user_consents")).isZero();
	}

	@Test
	void changedTermsRejectOldConsentAndAllowExplicitRetry() throws Exception {
		policyDocumentRepository.saveAndFlush(PolicyDocument.builder()
			.documentType(DocumentType.TERMS).version("draft-2").title("변경 약관").content("변경 내용").build());
		mockMvc.perform(post("/api/auth/signup").with(pending("sub-new-terms")).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("updated_terms", "동의", "[]", CONSENTS)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_409_03"));
		assertThat(count("users")).isZero();
		assertThat(count("oauth_identities")).isZero();
		mockMvc.perform(get("/api/policies/current"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[?(@.documentType=='TERMS')].version").value("draft-2"));

		mockMvc.perform(post("/api/auth/signup").with(pending("sub-new-terms")).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("updated_terms", "동의", "[]", CONSENTS.replaceFirst("draft-1", "draft-2"))))
			.andExpect(status().isCreated());
		assertThat(count("users")).isEqualTo(1);
		assertThat(count("user_consents")).isEqualTo(3);
	}

	@Test
	void interestsMustBeKnownDistinctAndAtMostThree() throws Exception {
		for (String interests : List.of("[\"NOPE\"]", "[\"PLAY\",\"PLAY\"]")) {
			mockMvc.perform(post("/api/auth/signup").with(pending("sub-cat"))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("cat_user", "카테고리", interests, CONSENTS)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("USER_400_02"));
		}
		mockMvc.perform(post("/api/auth/signup").with(pending("sub-cat"))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("cat_user", "카테고리", "[\"PLAY\",\"LIFE\",\"LEARNING\",\"DESIGN\"]", CONSENTS)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_400_01"))
			.andExpect(jsonPath("$.data.interests").exists());
		assertThat(count("users")).isZero();
	}

	@Test
	void usernameAndNicknameFormatsAreValidated() throws Exception {
		for (String username : List.of("ab", "has space", ".lead", "trail.", "dou..ble", "___", "한글아이디",
				"a".repeat(31))) {
			mockMvc.perform(post("/api/auth/signup").with(pending("sub-fmt"))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body(username, "닉네임", "[]", CONSENTS)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.data.username").exists());
		}
		assertThat(count("users")).isZero();
	}

	@Test
	void nicknameIsMeasuredByWeightedLengthAndAllowsOneCharacter() throws Exception {
		// 완성형 한글 2칸, 영문·숫자·공백 1칸, 합계 16칸까지. 한 글자도 허용한다.
		List<String> accepted = List.of("가", "a", "7", "사과먹는 개발자", "사과먹는개발자님", "가".repeat(8),
				"a".repeat(16), "가나다라abcdefgh", "Mixed 닉네임 99");
		for (int i = 0; i < accepted.size(); i++) {
			mockMvc.perform(post("/api/auth/signup").with(pending("sub-nick-" + i))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("nick_user_" + i, accepted.get(i), "[]", CONSENTS)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.member.nickname").value(accepted.get(i)));
		}
		assertThat(count("users")).isEqualTo(accepted.size());
	}

	@Test
	void nicknameOverWeightOrWithForbiddenCharactersIsRejected() throws Exception {
		List<String> rejected = List.of("사과먹는 개발자님", "가".repeat(9), "a".repeat(17), "가나다라abcdefghi", " 앞공백",
				"뒷공백 ", "두  칸", " ", "기호!", "ㅋㅋ", "ㅏㅏ", "개발ㅋㅋ", "이모지😀", "탭\\t포함", "줄\\n바꿈", "full　width");
		for (String nickname : rejected) {
			mockMvc.perform(post("/api/auth/signup").with(pending("sub-nick-bad"))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("valid_id", nickname, "[]", CONSENTS)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.data.nickname").exists());
		}
		assertThat(count("users")).isZero();
	}

	@Test
	void usernameAvailability() throws Exception {
		signupOk("avail-sub", "taken_name");
		mockMvc.perform(get("/api/auth/username-available").param("username", "free_name").with(pending("p")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.available").value(true));
		mockMvc.perform(get("/api/auth/username-available").param("username", "TAKEN_NAME").with(pending("p")))
			.andExpect(jsonPath("$.data.available").value(false));
		mockMvc.perform(get("/api/auth/username-available").param("username", "x")).andExpect(status().isUnauthorized());
	}

	private void signupOk(String subject, String username) throws Exception {
		mockMvc.perform(post("/api/auth/signup").with(pending(subject))
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(username, "닉네임", "[]", CONSENTS))).andExpect(status().isCreated());
	}

}

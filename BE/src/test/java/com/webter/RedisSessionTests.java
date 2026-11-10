package com.webter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.jayway.jsonpath.JsonPath;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import com.webter.global.security.ReturnPath;
import com.webter.global.security.SessionPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

// 로그인 흐름 전체(GoogleLoginFlowTests)를 서버 메모리 대신 Redis 세션으로 다시 실행하고,
// Redis에 저장된 세션 자체(키, 만료, 교체·삭제, 다른 앱 인스턴스에서의 인식)를 확인한다.
@ActiveProfiles("redis-session")
@Import(TestRedisConfiguration.class)
class RedisSessionTests extends GoogleLoginFlowTests {

	private static final String SESSION_KEY_PREFIX = "webter:session:sessions:";

	@Autowired
	StringRedisTemplate redis;

	@Autowired
	SessionRepository<?> sessions;

	@Autowired
	@Qualifier("redisContainer")
	GenericContainer<?> redisContainer;

	@Autowired
	@Qualifier("postgresContainer")
	PostgreSQLContainer postgres;

	// 쿠키 값(Base64)을 풀어 Redis에 저장된 세션 ID로 바꾼다
	String sessionId(Browser browser) {
		HttpCookie cookie = browser.cookies()
			.getCookieStore()
			.getCookies()
			.stream()
			.filter(c -> c.getName().equals("WEBTER_SESSION"))
			.findFirst()
			.orElseThrow();
		return new String(Base64.getDecoder().decode(cookie.getValue()), StandardCharsets.UTF_8);
	}

	String key(String sessionId) {
		return SESSION_KEY_PREFIX + sessionId;
	}

	String signup(Browser browser, String subject, String username) throws Exception {
		login(browser, "/", subject);
		String body = "{\"username\":\"" + username + "\",\"nickname\":\"웹터\",\"interests\":[\"PLAY\"],\"consents\":"
				+ CONSENTS_JSON + "}";
		assertThat(post(browser, "/api/auth/signup", csrf(browser), body).statusCode()).isEqualTo(201);
		return sessionId(browser);
	}

	static final String CONSENTS_JSON = """
			[{"documentType":"TERMS","version":"draft-1"},{"documentType":"PRIVACY","version":"draft-1"},
			 {"documentType":"AGE_CONFIRMATION","version":"draft-1"}]""";

	@Test
	void loginSessionLivesInRedisWithConfiguredTimeout() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-store", "redis_store");

		assertThat(redis.hasKey(key(id))).isTrue();
		// 세션 속성 값은 직렬화돼 저장되므로 세션 저장소를 통해 읽는다
		assertThat(sessions.findById(id).getMaxInactiveInterval()).isEqualTo(Duration.ofMinutes(30));
		assertThat(redis.opsForHash().keys(key(id))).contains("sessionAttr:SPRING_SECURITY_CONTEXT");
		// Redis 키도 비활동 만료 시간(30분) 안팎에서 사라진다
		assertThat(redis.getExpire(key(id))).isBetween(1500L, 2200L);
		assertThat(status(browser)).isEqualTo("MEMBER");
	}

	@Test
	void sessionIdIsReplacedOnLoginAndOldIdIsGone() throws Exception {
		Browser browser = browser();
		csrf(browser);
		String anonymousId = sessionId(browser);
		assertThat(redis.hasKey(key(anonymousId))).isTrue();

		login(browser, "/", "redis-rotate");
		String loggedInId = sessionId(browser);

		assertThat(loggedInId).isNotEqualTo(anonymousId);
		assertThat(redis.hasKey(key(anonymousId))).isFalse();
		assertThat(redis.hasKey(key(loggedInId))).isTrue();
		assertThat(status(browser)).isEqualTo("SIGNUP_PENDING");
	}

	@Test
	void logoutDeletesTheSessionFromRedis() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-logout", "redis_logout");

		assertThat(post(browser, "/api/auth/logout", csrf(browser), null).statusCode()).isEqualTo(200);

		assertThat(redis.hasKey(key(id))).isFalse();
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
	}

	@Test
	void withdrawalDeletesTheSessionFromRedis() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-withdraw", "redis_withdraw");

		var response = browser.client()
			.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/users/me"))
				.header("X-CSRF-TOKEN", csrf(browser))
				.DELETE()
				.build(), HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(redis.hasKey(key(id))).isFalse();
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
	}

	@Test
	void anotherAppInstanceRecognizesTheSameSession() throws Exception {
		Browser browser = browser();
		signup(browser, "redis-shared", "redis_shared");

		// 같은 Redis·DB를 쓰는 별도 앱 인스턴스(메모리를 공유하지 않는다)가 같은 쿠키로 로그인 상태를 인식한다
		// 접속 정보는 application.yaml의 값보다 우선하도록 명령행 인자로 넘긴다
		try (ConfigurableApplicationContext other = new SpringApplicationBuilder(WebterBackendApplication.class)
			.profiles("test", "redis-session")
			.run("--server.port=0", "--spring.datasource.url=" + postgres.getJdbcUrl(),
					"--spring.datasource.username=" + postgres.getUsername(),
					"--spring.datasource.password=" + postgres.getPassword(),
					"--spring.data.redis.host=" + redisContainer.getHost(),
					"--spring.data.redis.port=" + redisContainer.getFirstMappedPort())) {
			int otherPort = ((WebServerApplicationContext) other).getWebServer().getPort();
			assertThat(otherPort).isNotEqualTo(port);

			var response = get(browser, "http://localhost:" + otherPort + "/api/auth/session");
			assertThat(JsonPath.<String>read(response.body(), "$.data.status")).isEqualTo("MEMBER");
			assertThat(JsonPath.<String>read(response.body(), "$.data.member.username")).isEqualTo("redis_shared");
		}
	}

	@Test
	void everyAttributeKeptDuringLoginIsReadableFromRedis() throws Exception {
		// 로그인 시작 후: 복귀 경로, 구글 인증 요청 정보, CSRF 토큰
		Browser browser = browser();
		var flow = begin(browser, "/services/1");
		csrf(browser);
		var started = sessions.findById(sessionId(browser));
		assertThat(started.<String>getAttribute(ReturnPath.SESSION_ATTRIBUTE)).isEqualTo("/services/1");
		assertThat(started.<Object>getAttribute(
				"org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository.AUTHORIZATION_REQUEST"))
			.isNotNull();
		assertThat(started.<Object>getAttribute("org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository.CSRF_TOKEN"))
			.isNotNull();

		// 로그인 후: 로그인 주체(SecurityContext)
		callback(flow, "redis-attrs", "redis-attrs@example.test", true, "test-client", false, false);
		var loggedIn = sessions.findById(sessionId(browser));
		SecurityContext context = loggedIn.getAttribute("SPRING_SECURITY_CONTEXT");
		assertThat(context.getAuthentication().getPrincipal()).isEqualTo(
				new SessionPrincipal.PendingSignup("redis-attrs", "redis-attrs@example.test"));
	}

	static final String CONTEXT_FIELD = "sessionAttr:SPRING_SECURITY_CONTEXT";

	@Test
	void sessionValuesAreStoredAsJson() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-json", "redis_json");

		String raw = (String) redis.opsForHash().get(key(id), CONTEXT_FIELD);

		assertThat(raw).startsWith("{").contains("\"@class\"").contains("\"userId\"");
		// 구글 식별자·이메일은 가입을 마친 회원 세션에 남지 않는다
		assertThat(raw).doesNotContain("redis-json");
		assertThat(status(browser)).isEqualTo("MEMBER");
	}

	@Test
	void unreadableSessionValueMeansLoggedOutInsteadOfError() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-broken", "redis_broken");
		redis.opsForHash().put(key(id), CONTEXT_FIELD, "not-readable");

		assertThat(get(browser, "/api/auth/session").statusCode()).isEqualTo(200);
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
		assertThat(get(browser, "/api/anything").statusCode()).isEqualTo(401);
	}

	@Test
	void fieldsAddedByALaterDeployDoNotBreakExistingSessions() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-evolve", "redis_evolve");
		String raw = (String) redis.opsForHash().get(key(id), CONTEXT_FIELD);
		String evolved = raw.replace("\"userId\"", "\"addedLater\":\"x\",\"userId\"");
		assertThat(evolved).isNotEqualTo(raw);
		redis.opsForHash().put(key(id), CONTEXT_FIELD, evolved);

		assertThat(status(browser)).isEqualTo("MEMBER");
	}

	@Test
	void readinessReflectsRedisAvailability() throws Exception {
		assertThat(get(browser(), "/health/readiness").statusCode()).isEqualTo(200);
		var docker = redisContainer.getDockerClient();
		docker.pauseContainerCmd(redisContainer.getContainerId()).exec();
		try {
			// 세션 쿠키가 없는 상태 확인 요청도 Redis가 응답하지 않으면 준비되지 않은 것으로 본다
			assertThat(get(browser(), "/health/readiness").statusCode()).isEqualTo(503);
			assertThat(get(browser(), "/health/liveness").statusCode()).isEqualTo(200);
		}
		finally {
			docker.unpauseContainerCmd(redisContainer.getContainerId()).exec();
		}
		// 재개 직후에는 Redis 연결이 복구되는 데 시간이 걸릴 수 있어 잠시 기다린다
		await().atMost(Duration.ofSeconds(15))
			.untilAsserted(() -> assertThat(get(browser(), "/health/readiness").statusCode()).isEqualTo(200));
	}

	@Test
	void sessionWithUnreadableMetadataIsDiscarded() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-meta", "redis_meta");
		redis.opsForHash().put(key(id), "creationTime", "not-a-number");

		// 필수 값을 읽지 못하면 500이 아니라 비로그인으로 처리하고 Redis에서 세션을 지운다
		assertThat(get(browser, "/api/auth/session").statusCode()).isEqualTo(200);
		assertThat(redis.hasKey(key(id))).isFalse();
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
	}

	@Test
	void sessionMissingMetadataIsDiscarded() throws Exception {
		Browser browser = browser();
		String id = signup(browser, "redis-nometa", "redis_nometa");
		redis.opsForHash().delete(key(id), "maxInactiveInterval");

		assertThat(status(browser)).isEqualTo("ANONYMOUS");
		assertThat(redis.hasKey(key(id))).isFalse();
	}

}

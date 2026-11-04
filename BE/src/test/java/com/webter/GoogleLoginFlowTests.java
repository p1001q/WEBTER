package com.webter;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.test.context.ActiveProfiles;

// 실제 Google 대신 가짜 OIDC 서버(OidcTestProvider)로 로그인 흐름 전체를 HTTP로 확인한다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"app.auth.google-client-id=test-client", "app.auth.google-client-secret=test-only-not-a-real-secret",
		"app.auth.frontend-origin=http://localhost:3000", "server.servlet.session.cookie.secure=false" })
@ActiveProfiles("test")
@Import({ TestcontainersConfiguration.class, GoogleLoginFlowTests.ProviderConfiguration.class })
class GoogleLoginFlowTests {

	private static final String FRONTEND = "http://localhost:3000";

	private static final String CONSENTS = """
			[{"documentType":"TERMS","version":"draft-1"},{"documentType":"PRIVACY","version":"draft-1"},
			 {"documentType":"AGE_CONFIRMATION","version":"draft-1"}]""";

	@LocalServerPort
	int port;

	@Autowired
	OidcTestProvider provider;

	@Autowired
	JdbcTemplate jdbc;

	record Browser(HttpClient client, CookieManager cookies) {
	}

	record Flow(Browser browser, Map<String, String> authorization) {
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class ProviderConfiguration {

		@Bean(destroyMethod = "close")
		OidcTestProvider testOidcProvider() throws Exception {
			return new OidcTestProvider();
		}

		@Bean
		@Primary
		ClientRegistrationRepository testRegistrations(OidcTestProvider provider) {
			var google = ClientRegistration.withRegistrationId("google")
				.clientId("test-client")
				.clientSecret("test-only-not-a-real-secret")
				.authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
				.redirectUri("{baseUrl}/login/oauth2/code/google")
				.scope("openid", "email")
				.authorizationUri(provider.origin() + "/authorize")
				.tokenUri(provider.origin() + "/token")
				.jwkSetUri(provider.origin() + "/jwks")
				.issuerUri("https://accounts.google.com")
				.userInfoUri(provider.origin() + "/userinfo")
				.userNameAttributeName("sub")
				.build();
			return id -> "google".equals(id) ? google : null;
		}

	}

	@BeforeEach
	void cleanUsers() {
		jdbc.update("DELETE FROM users");
	}

	Browser browser() {
		var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
		return new Browser(
				HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).build(),
				cookies);
	}

	HttpResponse<String> get(Browser browser, String path) throws Exception {
		String url = path.startsWith("http") ? path : "http://localhost:" + port + path;
		return browser.client()
			.send(HttpRequest.newBuilder(URI.create(url)).GET().build(), HttpResponse.BodyHandlers.ofString());
	}

	HttpResponse<String> post(Browser browser, String path, String csrf, String json) throws Exception {
		var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
			.header("Content-Type", "application/json");
		if (csrf != null) {
			request.header("X-CSRF-TOKEN", csrf);
		}
		return browser.client()
			.send(request.POST(HttpRequest.BodyPublishers.ofString(json == null ? "" : json)).build(),
					HttpResponse.BodyHandlers.ofString());
	}

	String csrf(Browser browser) throws Exception {
		return JsonPath.read(get(browser, "/api/auth/csrf").body(), "$.data.token");
	}

	String status(Browser browser) throws Exception {
		return JsonPath.read(get(browser, "/api/auth/session").body(), "$.data.status");
	}

	Flow begin(Browser browser, String returnTo) throws Exception {
		var start = get(browser, "/api/auth/login/google?returnTo=" + URLEncoder.encode(returnTo, StandardCharsets.UTF_8));
		assertThat(start.statusCode()).isEqualTo(302);
		var authorization = get(browser, start.headers().firstValue("Location").orElseThrow());
		assertThat(authorization.statusCode()).isEqualTo(302);
		return new Flow(browser,
				OidcTestProvider.query(URI.create(authorization.headers().firstValue("Location").orElseThrow())));
	}

	HttpResponse<String> callback(Flow flow, String subject, String email, boolean verified, String audience,
			boolean expired, boolean badSignature) throws Exception {
		String code = provider.code(new OidcTestProvider.Identity(subject, email, verified,
				flow.authorization().get("nonce"), audience, expired, badSignature));
		return get(flow.browser(), "/login/oauth2/code/google?code=" + code + "&state="
				+ URLEncoder.encode(flow.authorization().get("state"), StandardCharsets.UTF_8));
	}

	HttpResponse<String> login(Browser browser, String returnTo, String subject) throws Exception {
		return callback(begin(browser, returnTo), subject, subject + "@example.test", true, "test-client", false, false);
	}

	String location(HttpResponse<?> response) {
		return response.headers().firstValue("Location").orElseThrow();
	}

	@Test
	void newUserOnboardsThenReturningUserGoesStraightBack() throws Exception {
		Browser browser = browser();
		String sessionBefore = csrf(browser) == null ? "" : browser.cookies().getCookieStore().getCookies().getFirst().getValue();

		var success = login(browser, "/services/42?tab=reviews", "google-new");
		// 신규 사용자: 구글 인증만으로는 회원 정보가 만들어지지 않고, 온보딩으로 보낸다
		assertThat(success.statusCode()).isEqualTo(302);
		assertThat(location(success)).isEqualTo(FRONTEND + "/onboarding?back=%2Fservices%2F42%3Ftab%3Dreviews");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
		assertThat(browser.cookies().getCookieStore().getCookies().getFirst().getValue()).isNotEqualTo(sessionBefore);
		assertThat(success.headers().allValues("Set-Cookie").stream()
			.anyMatch(c -> c.contains("WEBTER_SESSION=") && c.contains("HttpOnly") && c.contains("SameSite=Lax"))).isTrue();
		var pending = get(browser, "/api/auth/session");
		assertThat(status(browser)).isEqualTo("SIGNUP_PENDING");
		assertThat(pending.body()).doesNotContain("access_token", "id_token", "google-new\"");
		assertThat(get(browser, "/api/anything").statusCode()).isEqualTo(403);

		// 최종 제출
		String body = "{\"username\":\"webter_user\",\"nickname\":\"웹터\",\"interests\":[\"PLAY\"],\"consents\":" + CONSENTS + "}";
		assertThat(post(browser, "/api/auth/signup", null, body).statusCode()).isEqualTo(403);
		var signup = post(browser, "/api/auth/signup", csrf(browser), body);
		assertThat(signup.statusCode()).isEqualTo(201);
		assertThat(status(browser)).isEqualTo("MEMBER");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM oauth_identities WHERE provider_subject = 'google-new'",
				Integer.class)).isEqualTo(1);

		// 로그아웃하면 이전 로그인 상태로 회원 기능을 쓸 수 없다
		var logout = post(browser, "/api/auth/logout", csrf(browser), null);
		assertThat(logout.statusCode()).isEqualTo(200);
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
		assertThat(get(browser, "/api/anything").statusCode()).isEqualTo(401);

		// 다시 로그인: 이미 가입한 회원이므로 온보딩 없이 보던 페이지로 돌아간다
		Browser again = browser();
		var back = login(again, "/services/42?tab=reviews", "google-new");
		assertThat(location(back)).isEqualTo(FRONTEND + "/services/42?tab=reviews");
		assertThat(status(again)).isEqualTo("MEMBER");
		assertThat(JsonPath.<String>read(get(again, "/api/auth/session").body(), "$.data.member.username"))
			.isEqualTo("webter_user");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
	}

	@Test
	void abandonedOnboardingLeavesNothingAndRestartsFromScratch() throws Exception {
		Browser browser = browser();
		login(browser, "/", "google-abandon");
		assertThat(status(browser)).isEqualTo("SIGNUP_PENDING");
		// 이탈 후 다시 로그인해도 DB에는 아무 것도 없고 다시 온보딩이다
		var again = login(browser(), "/", "google-abandon");
		assertThat(location(again)).isEqualTo(FRONTEND + "/onboarding");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM oauth_identities", Integer.class)).isZero();
	}

	@Test
	void sameEmailDifferentGoogleAccountIsAnotherUser() throws Exception {
		Browser first = browser();
		callback(begin(first, "/"), "subject-a", "shared@example.test", true, "test-client", false, false);
		String body = "{\"username\":\"webter_user\",\"nickname\":\"웹터\",\"interests\":[\"PLAY\"],\"consents\":" + CONSENTS + "}";
		assertThat(post(first, "/api/auth/signup", csrf(first), body).statusCode()).isEqualTo(201);
		Browser second = browser();
		var response = callback(begin(second, "/"), "subject-b", "shared@example.test", true, "test-client", false, false);
		// 같은 이메일이어도 구글 식별자가 다르면 기존 회원이 아니라 가입 대기다
		assertThat(location(response)).startsWith(FRONTEND + "/onboarding");
		assertThat(status(second)).isEqualTo("SIGNUP_PENDING");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
	}

	@Test
	void rejectedIdentitiesNeverCreateASession() throws Exception {
		Browser unverified = browser();
		var r1 = callback(begin(unverified, "/x"), "s1", "a@example.test", false, "test-client", false, false);
		assertThat(location(r1)).isEqualTo(FRONTEND + "/login?error=failed&back=%2Fx");
		assertThat(status(unverified)).isEqualTo("ANONYMOUS");

		for (var bad : new boolean[][] { { true, false }, { false, true } }) {
			Browser browser = browser();
			var response = callback(begin(browser, "/"), "s2", "b@example.test", true, "test-client", bad[0], bad[1]);
			assertThat(location(response)).isEqualTo(FRONTEND + "/login?error=failed");
			assertThat(status(browser)).isEqualTo("ANONYMOUS");
		}
		Browser wrongAudience = browser();
		var r3 = callback(begin(wrongAudience, "/"), "s3", "c@example.test", true, "someone-else", false, false);
		assertThat(location(r3)).isEqualTo(FRONTEND + "/login?error=failed");
		assertThat(status(wrongAudience)).isEqualTo("ANONYMOUS");
	}

	@Test
	void cancelledConsentGoesBackToLogin() throws Exception {
		Browser browser = browser();
		Flow flow = begin(browser, "/mypage");
		var response = get(browser, "/login/oauth2/code/google?error=access_denied&state="
				+ URLEncoder.encode(flow.authorization().get("state"), StandardCharsets.UTF_8));
		assertThat(location(response)).isEqualTo(FRONTEND + "/login?error=cancelled&back=%2Fmypage");
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
	}

	@Test
	void stateMismatchIsRejected() throws Exception {
		Browser browser = browser();
		Flow flow = begin(browser, "/");
		String code = provider.code(new OidcTestProvider.Identity("s4", "d@example.test", true,
				flow.authorization().get("nonce"), "test-client", false, false));
		var response = get(browser, "/login/oauth2/code/google?code=" + code + "&state=forged");
		assertThat(location(response)).startsWith(FRONTEND + "/login?error=failed");
		assertThat(status(browser)).isEqualTo("ANONYMOUS");
	}

	@Test
	void unsafeReturnPathsAreRejectedBeforeLeavingForGoogle() throws Exception {
		Browser browser = browser();
		for (String path : new String[] { "https://evil.example.com", "//evil.example.com", "/\\evil", "/a/../b",
				"/%2e%2e/x" }) {
			var response = get(browser, "/api/auth/login/google?returnTo=" + URLEncoder.encode(path, StandardCharsets.UTF_8));
			assertThat(response.statusCode()).as(path).isEqualTo(400);
		}
	}

}

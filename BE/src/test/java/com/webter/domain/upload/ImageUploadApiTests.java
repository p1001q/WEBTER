package com.webter.domain.upload;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.IntegrationTest;
import com.webter.domain.upload.service.ImageVerifier;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.security.SessionPrincipal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

// 이미지 업로드 주소 발급과 올린 파일 검증. S3 호환 저장소(S3Mock) 컨테이너를 쓴다(Docker 필요).
// S3Mock은 서명의 형식·크기 제한을 검사하지 않으므로 그 제한은 이 테스트로 확인하지 않는다.
class ImageUploadApiTests extends IntegrationTest {

	static final String BUCKET = "webter-test-images";

	static final GenericContainer<?> STORAGE = new GenericContainer<>(DockerImageName.parse("adobe/s3mock:5.2.3"))
		.withExposedPorts(9090)
		.withEnv("COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS", BUCKET)
		.waitingFor(Wait.forListeningPort());

	static {
		STORAGE.start();
	}

	static String endpoint() {
		return "http://" + STORAGE.getHost() + ":" + STORAGE.getMappedPort(9090);
	}

	@DynamicPropertySource
	static void storage(DynamicPropertyRegistry registry) {
		registry.add("app.image.bucket", () -> BUCKET);
		registry.add("app.image.endpoint", ImageUploadApiTests::endpoint);
		registry.add("app.image.public-endpoint", ImageUploadApiTests::endpoint);
		registry.add("app.image.public-base-url", () -> endpoint() + "/" + BUCKET);
		registry.add("app.image.access-key", () -> "test-access-key");
		registry.add("app.image.secret-key", () -> "test-secret-key");
	}

	@Autowired
	MockMvc mockMvc;

	@Autowired
	ImageVerifier verifier;

	@Autowired
	UserRepository users;

	@Autowired
	JdbcTemplate jdbc;

	final HttpClient http = HttpClient.newHttpClient();

	static final byte[] PNG = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 };

	RequestPostProcessor member() {
		return member(UUID.randomUUID());
	}

	RequestPostProcessor member(UUID id) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(
				new SessionPrincipal.Member(id), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
	}

	ResultActions issue(String contentType, long size) throws Exception {
		return mockMvc.perform(post("/api/uploads/images").with(member()).with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"contentType\":\"" + contentType + "\",\"size\":" + size + "}"));
	}

	/** 발급받은 주소로 파일을 올리고 올린 이미지의 주소를 돌려준다 */
	String upload(String contentType, byte[] body) throws Exception {
		String json = issue(contentType, body.length).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(JsonPath.read(json, "$.data.uploadUrl")));
		Map<String, String> headers = JsonPath.read(json, "$.data.headers");
		headers.forEach((k, v) -> {
			if (!k.equalsIgnoreCase("Content-Length")) {
				request.header(k, v);
			}
		});
		HttpResponse<String> response = http.send(request.PUT(HttpRequest.BodyPublishers.ofByteArray(body)).build(),
				HttpResponse.BodyHandlers.ofString());
		assertThat(response.statusCode()).isIn(200, 201, 204);
		return JsonPath.read(json, "$.data.imageUrl");
	}

	@Test
	void issuedUrlUploadsAnImageThatCanBeVerifiedAndFetched() throws Exception {
		String json = issue("image/png", PNG.length).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.method").value("PUT"))
			.andExpect(jsonPath("$.data.headers['Content-Type']").value("image/png"))
			.andReturn().getResponse().getContentAsString();
		String imageUrl = JsonPath.read(json, "$.data.imageUrl");
		assertThat(imageUrl).startsWith(endpoint() + "/" + BUCKET + "/uploads/").endsWith(".png");
		assertThat((String) JsonPath.read(json, "$.data.uploadUrl")).contains("X-Amz-Signature");

		String uploaded = upload("image/png", PNG);
		verifier.verify(uploaded);
		assertThat(verifier.isOwnUrl(uploaded)).isTrue();
		HttpResponse<byte[]> fetched = http.send(HttpRequest.newBuilder(URI.create(uploaded)).GET().build(),
				HttpResponse.BodyHandlers.ofByteArray());
		assertThat(fetched.statusCode()).isEqualTo(200);
		assertThat(fetched.body()).isEqualTo(PNG);
	}

	@Test
	void eachIssuedImageGetsADifferentUnguessableName() throws Exception {
		String a = JsonPath.read(issue("image/jpeg", 100).andReturn().getResponse().getContentAsString(), "$.data.imageUrl");
		String b = JsonPath.read(issue("image/jpeg", 100).andReturn().getResponse().getContentAsString(), "$.data.imageUrl");
		assertThat(a).isNotEqualTo(b).endsWith(".jpg");
	}

	@Test
	void onlyJpegPngAndWebpUpToFiveMegabytesAreIssued() throws Exception {
		issue("image/gif", 100).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UPLOAD_400_01"));
		issue("text/html", 100).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UPLOAD_400_01"));
		issue("image/webp", 0).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UPLOAD_400_02"));
		issue("image/webp", 5L * 1024 * 1024 + 1).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("UPLOAD_400_02"));
		issue("image/webp", 5L * 1024 * 1024).andExpect(status().isOk());
	}

	@Test
	void aFileThatIsNotReallyAnImageIsRejectedAfterUpload() throws Exception {
		String uploaded = upload("image/png", "<html>not an image</html>".getBytes());
		assertThatThrownBy(() -> verifier.verify(uploaded)).isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException) e).getErrorCode().getCode()).isEqualTo("UPLOAD_400_03");
	}

	@Test
	void profileAvatarCanBeSavedKeptAndCleared() throws Exception {
		UUID id = users.saveAndFlush(User.builder().username("avatar_test").nickname("사진 테스트").build()).getId();
		String imageUrl = upload("image/png", PNG);
		String profile = """
				{"username":"avatar_test","nickname":"사진 테스트"%s}
				""";
		saveProfile(id, profile.formatted(",\"avatarUrl\":\"" + imageUrl + "\""))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.avatarUrl").value(imageUrl));
		saveProfile(id, profile.formatted(""))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.avatarUrl").value(imageUrl));
		saveProfile(id, profile.formatted(",\"avatarUrl\":\"https://foreign.example.test/photo.png\""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UPLOAD_400_04"));

		mockMvc.perform(get("/api/auth/session").with(member(id)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.member.avatarUrl").value(imageUrl));
		mockMvc.perform(get("/api/users/" + id))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.avatarUrl").value(imageUrl));

		jdbc.update("UPDATE users SET visibility_status = 'TEMP_HIDDEN' WHERE user_id = ?", id);
		mockMvc.perform(get("/api/users/" + id))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.avatarUrl").doesNotExist());
		saveProfile(id, profile.formatted(",\"avatarUrl\":\"\""))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.avatarUrl").doesNotExist());
		mockMvc.perform(get("/api/auth/session").with(member(id)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.member.avatarUrl").doesNotExist());
	}

	private ResultActions saveProfile(UUID id, String profile) throws Exception {
		return mockMvc.perform(put("/api/users/me").with(member(id)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content(profile));
	}

	@Test
	void missingOrForeignImagesAreNotAccepted() {
		String missing = endpoint() + "/" + BUCKET + "/uploads/2026/11/" + UUID.randomUUID() + ".png";
		assertThatThrownBy(() -> verifier.verify(missing)).isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException) e).getErrorCode().getCode()).isEqualTo("UPLOAD_400_04");
		for (String url : java.util.Arrays.asList("https://evil.example.test/uploads/x.png", endpoint() + "/" + BUCKET + "/other/x.png",
				endpoint() + "/" + BUCKET + "/uploads/../secret.png", endpoint() + "/" + BUCKET + "/uploads/%2e%2e/x.png",
				endpoint() + "/" + BUCKET + "/uploads/x.png?a=b", "", null)) {
			assertThat(verifier.isOwnUrl(url)).as(String.valueOf(url)).isFalse();
		}
	}

	@Test
	void membersOnlyAndCsrfRequired() throws Exception {
		mockMvc.perform(post("/api/uploads/images").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"contentType\":\"image/png\",\"size\":10}")).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/uploads/images").with(member()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"contentType\":\"image/png\",\"size\":10}")).andExpect(status().isForbidden());
		mockMvc.perform(post("/api/uploads/images").with(member()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"size\":10}")).andExpect(status().isBadRequest());
	}

}

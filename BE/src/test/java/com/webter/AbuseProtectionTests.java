package com.webter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.webter.global.security.AbuseProtection;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.abuse.search-per-minute=2")
@ActiveProfiles("redis-session")
@Import(TestRedisConfiguration.class)
class AbuseProtectionTests extends IntegrationTest {
	@Autowired AbuseProtection limits;
	@Autowired MockMvc mvc;

	@Test
	void forwardedHeaderCannotResetIpLimitAndResponseHasRetryAfter() throws Exception {
		for (int i = 0; i < 2; i++) mvc.perform(get("/api/services").with(r -> { r.setRemoteAddr("203.0.113.43"); return r; }))
			.andExpect(status().isOk());
		var response = mvc.perform(get("/api/services").header("X-Forwarded-For", "8.8.8.8")
			.with(r -> { r.setRemoteAddr("203.0.113.43"); return r; })).andExpect(status().isTooManyRequests()).andReturn().getResponse();
		assertThat(Long.parseLong(response.getHeader("Retry-After"))).isBetween(1L, 60L);
	}

	@Test
	void redisCounterDoesNotOversubscribeUnderConcurrentRequests() throws Exception {
		AtomicInteger accepted = new AtomicInteger();
		String subject = UUID.randomUUID().toString();
		try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
			var tasks = java.util.stream.IntStream.range(0, 40).mapToObj(i -> pool.submit(() -> {
				try { limits.consume("concurrency-test", subject, 10, Duration.ofMinutes(1)); accepted.incrementAndGet(); }
				catch (AbuseProtection.LimitExceeded expected) { }
			})).toList();
			for (var task : tasks) task.get();
		}
		assertThat(accepted.get()).isEqualTo(10);
	}

	@Test
	void oversizedJsonIsRejectedBeforeDeserialization() throws Exception {
		mvc.perform(post("/api/services").contentType(MediaType.APPLICATION_JSON).content("x".repeat(128 * 1024 + 1)))
			.andExpect(status().isPayloadTooLarge());
	}

	@Test
	void jsonSuffixTypesAndMissingTypeHaveTheSameBodyLimit() throws Exception {
		String body = "x".repeat(128 * 1024 + 1);
		mvc.perform(post("/api/services").contentType("application/vnd.webter+json").content(body))
			.andExpect(status().isPayloadTooLarge());
		mvc.perform(post("/api/services").content(body)).andExpect(status().isPayloadTooLarge());
		mvc.perform(post(URI.create("/%61pi/services")).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isPayloadTooLarge());
	}

	@Test
	void percentEncodedPathCannotSkipSearchLimit() throws Exception {
		// 인코딩한 경로도 같은 목록 API에 매핑되므로 같은 IP 한도를 소비해야 한다.
		for (int i = 0; i < 2; i++) mvc.perform(get(URI.create("/api/%73ervices")).with(r -> { r.setRemoteAddr("203.0.113.61"); return r; }))
			.andExpect(status().isOk());
		mvc.perform(get("/api/services").with(r -> { r.setRemoteAddr("203.0.113.61"); return r; }))
			.andExpect(status().isTooManyRequests());
	}
}

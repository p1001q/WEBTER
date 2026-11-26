package com.webter.domain.webservice.service;

import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.global.exception.BusinessException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** 키·요청 URL·외부 오류 원문은 기록하지 않는다. 장애·미설정은 CLEAR로 처리하지 않는다. */
@Component
public class WebRiskClient {

	private final String key;
	private final JsonMapper json;
	private final com.webter.global.security.AbuseProtection limits;
	private final java.util.concurrent.ConcurrentHashMap<String, Result> redirectCache = new java.util.concurrent.ConcurrentHashMap<>();
	private final HttpClient http;
	private final java.util.concurrent.Semaphore requests = new java.util.concurrent.Semaphore(8);

	@org.springframework.beans.factory.annotation.Autowired
	public WebRiskClient(@Value("${app.url-security.web-risk-api-key:}") String key, JsonMapper json,
			com.webter.global.security.AbuseProtection limits) {
		this(key, json, limits, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2))
			.followRedirects(HttpClient.Redirect.NEVER).build());
	}

	WebRiskClient(String key, JsonMapper json, com.webter.global.security.AbuseProtection limits, HttpClient http) {
		this.key = key; this.json = json; this.limits = limits; this.http = http;
	}

	public record Result(boolean unsafe, Instant expiresAt) { }

	public boolean isConfigured() { return key != null && !key.isBlank(); }

	public void invalidate(String url) { redirectCache.remove(url); }

	public Result check(String url) {
		if (key == null || key.isBlank()) throw new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE);
		Result cached = redirectCache.get(url);
		if (cached != null && cached.expiresAt().isAfter(Instant.now())) return cached;
		if (redirectCache.size() >= 1000) redirectCache.clear();
		String query = "https://webrisk.googleapis.com/v1/uris:search?threatTypes=MALWARE"
			+ "&threatTypes=SOCIAL_ENGINEERING&threatTypes=UNWANTED_SOFTWARE&uri="
			+ URLEncoder.encode(url, StandardCharsets.UTF_8);
		if (!requests.tryAcquire()) throw new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE);
		java.util.concurrent.CompletableFuture<HttpResponse<byte[]>> pending = null;
		try {
			limits.consume("web-risk", "application", limits.limit("web-risk-per-day", 1000), Duration.ofDays(1));
			var request = HttpRequest.newBuilder(URI.create(query)).timeout(Duration.ofSeconds(4))
				.header("X-Goog-Api-Key", key).GET().build();
			pending = http.sendAsync(request, info -> new LimitedBodySubscriber(16_384));
			var response = pending.get(4, java.util.concurrent.TimeUnit.SECONDS);
				if (response.statusCode() != 200) throw new IllegalStateException("Lookup failed");
				byte[] bytes = response.body();
				if (bytes.length > 16_384) throw new IllegalStateException("Response too large");
				var root = json.readTree(bytes);
				if (!root.isObject()) throw new IllegalStateException("Invalid response");
				var threat = root.get("threat");
				if (threat == null) {
					if (!root.isEmpty()) throw new IllegalStateException("Unexpected response");
					return remember(url, new Result(false, Instant.now().plusSeconds(3600)));
				}
				if (!threat.path("threatTypes").isArray() || threat.path("threatTypes").isEmpty())
					throw new IllegalStateException("Missing threat type");
				return remember(url, new Result(true, Instant.parse(threat.path("expireTime").asText())));
		}
		catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
		catch (com.webter.global.security.AbuseProtection.LimitExceeded ex) { throw ex; }
		catch (Exception ex) { /* 외부 예외는 인증 정보·URL을 담을 수 있어 전파하지 않는다. */ }
		finally {
			if (pending != null && !pending.isDone()) pending.cancel(true);
			requests.release();
		}
		throw new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE);
	}

	private Result remember(String url, Result result) {
		Instant max = Instant.now().plusSeconds(3600);
		Result bounded = new Result(result.unsafe(), result.expiresAt().isBefore(max) ? result.expiresAt() : max);
		if (!bounded.expiresAt().isAfter(Instant.now())) throw new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE);
		redirectCache.put(url, bounded);
		return bounded;
	}

	/** 본문 수신까지 끝나야 응답을 완료해 요청 timeout과 메모리 상한을 함께 적용한다. */
	static final class LimitedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
		private final int max;
		private final java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
		private final java.util.concurrent.CompletableFuture<byte[]> body = new java.util.concurrent.CompletableFuture<>();
		private java.util.concurrent.Flow.Subscription subscription;

		LimitedBodySubscriber(int max) { this.max = max; }
		public java.util.concurrent.CompletionStage<byte[]> getBody() { return body; }
		public void onSubscribe(java.util.concurrent.Flow.Subscription subscription) {
			this.subscription = subscription;
			subscription.request(1);
		}
		public void onNext(java.util.List<java.nio.ByteBuffer> chunks) {
			if (body.isDone()) return;
			for (var chunk : chunks) {
				if (chunk.remaining() > max - bytes.size()) {
					subscription.cancel();
					body.completeExceptionally(new java.io.IOException("Response too large"));
					return;
				}
				byte[] part = new byte[chunk.remaining()];
				chunk.get(part);
				bytes.writeBytes(part);
			}
			subscription.request(1);
		}
		public void onError(Throwable error) { body.completeExceptionally(error); }
		public void onComplete() { body.complete(bytes.toByteArray()); }
	}
}

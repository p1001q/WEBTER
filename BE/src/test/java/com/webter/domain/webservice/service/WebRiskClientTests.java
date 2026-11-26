package com.webter.domain.webservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.webter.global.exception.BusinessException;
import com.webter.global.security.AbuseProtection;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

class WebRiskClientTests {
	@SuppressWarnings("unchecked")
	private static HttpResponse<byte[]> response(int status, String body) {
		HttpResponse<byte[]> response = mock(HttpResponse.class);
		when(response.statusCode()).thenReturn(status);
		when(response.body()).thenReturn(body.getBytes(StandardCharsets.UTF_8));
		return response;
	}

	@Test
	void keyIsSentOnlyInHeaderAndClearResultIsCached() throws Exception {
		HttpClient http = mock(HttpClient.class);
		var clear = response(200, "{}");
		when(http.sendAsync(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(java.util.concurrent.CompletableFuture.completedFuture(clear));
		WebRiskClient client = new WebRiskClient("secret-key", JsonMapper.builder().build(), mock(AbuseProtection.class), http);
		assertThat(client.check("https://example.test/?a=1&b=2").unsafe()).isFalse();
		assertThat(client.check("https://example.test/?a=1&b=2").unsafe()).isFalse();
		var request = ArgumentCaptor.forClass(HttpRequest.class);
		verify(http).sendAsync(request.capture(), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
		assertThat(request.getValue().headers().firstValue("X-Goog-Api-Key")).contains("secret-key");
		assertThat(request.getValue().uri().toString()).doesNotContain("secret-key").contains("uri=https%3A%2F%2Fexample.test%2F%3Fa%3D1%26b%3D2");
	}

	@Test
	void missingKeyErrorsMalformedAndOversizedResponsesNeverPass() throws Exception {
		assertThatThrownBy(() -> new WebRiskClient("", JsonMapper.builder().build(), mock(AbuseProtection.class), mock(HttpClient.class)).check("https://example.test"))
			.isInstanceOf(BusinessException.class);
		for (var bad : java.util.List.of(response(500, "{}"), response(200, "not-json"), response(200, "{\"unexpected\":true}"), response(200, " ".repeat(16_385)), response(200, "{\"threat\":{\"threatTypes\":[\"MALWARE\"],\"expireTime\":\"2000-01-01T00:00:00Z\"}}"))) {
			HttpClient http = mock(HttpClient.class);
			when(http.sendAsync(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(java.util.concurrent.CompletableFuture.completedFuture(bad));
			WebRiskClient client = new WebRiskClient("key", JsonMapper.builder().build(), mock(AbuseProtection.class), http);
			assertThatThrownBy(() -> client.check("https://example.test")).isInstanceOf(BusinessException.class);
		}
	}

	@Test
	void oversizedStreamIsCancelledBeforePublishingBody() {
		var subscriber = new WebRiskClient.LimitedBodySubscriber(4);
		var subscription = mock(java.util.concurrent.Flow.Subscription.class);
		subscriber.onSubscribe(subscription);
		subscriber.onNext(java.util.List.of(java.nio.ByteBuffer.wrap(new byte[5])));
		verify(subscription).cancel();
		assertThatThrownBy(() -> subscriber.getBody().toCompletableFuture().join()).isInstanceOf(java.util.concurrent.CompletionException.class);
	}

	@Test
	void bodyIsNotPublishedUntilAllChunksComplete() {
		var subscriber = new WebRiskClient.LimitedBodySubscriber(4);
		subscriber.onSubscribe(mock(java.util.concurrent.Flow.Subscription.class));
		subscriber.onNext(java.util.List.of(java.nio.ByteBuffer.wrap(new byte[]{1, 2})));
		assertThat(subscriber.getBody().toCompletableFuture().isDone()).isFalse();
		subscriber.onNext(java.util.List.of(java.nio.ByteBuffer.wrap(new byte[]{3, 4})));
		subscriber.onComplete();
		assertThat(subscriber.getBody().toCompletableFuture().join()).containsExactly((byte)1, (byte)2, (byte)3, (byte)4);
	}

	@Test
	void stalledResponseIsCancelledAtOverallDeadline() throws Exception {
		HttpClient http = mock(HttpClient.class);
		var pending = new java.util.concurrent.CompletableFuture<HttpResponse<byte[]>>();
		when(http.sendAsync(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenReturn(pending);
		WebRiskClient client = new WebRiskClient("key", JsonMapper.builder().build(), mock(AbuseProtection.class), http);
		assertThatThrownBy(() -> client.check("https://example.test")).isInstanceOf(BusinessException.class);
		assertThat(pending.isCancelled()).isTrue();
	}
}

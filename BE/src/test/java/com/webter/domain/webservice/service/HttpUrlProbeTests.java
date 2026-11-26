package com.webter.domain.webservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.net.SocketException;
import java.time.Instant;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.message.BasicClassicHttpResponse;
import org.apache.hc.core5.http.message.BasicHeader;
import org.junit.jupiter.api.Test;

class HttpUrlProbeTests {
	@Test
	void successfulAndAuthenticationRequiredResponsesPassBut404DoesNot() throws Exception {
		CloseableHttpClient client = mock(CloseableHttpClient.class);
		when(client.executeOpen(any(), any(), any())).thenReturn(new BasicClassicHttpResponse(200), new BasicClassicHttpResponse(404), new BasicClassicHttpResponse(403));
		HttpUrlProbe probe = new HttpUrlProbe(client, mock(WebRiskClient.class));
		try {
			assertThat(probe.isReachable("https://example.test/")).isTrue();
			assertThat(probe.isReachable("https://example.test/missing")).isFalse();
			assertThat(probe.isReachable("https://example.test/private")).isTrue();
		} finally { probe.close(); }
	}

	@Test
	void responseThatFailsWhileClosingAfterCancelIsJudgedByItsStatus() throws Exception {
		// 본문을 나눠 보내는 응답은 연결을 끊은 뒤 닫을 때 소켓 오류가 난다. 이미 읽은 상태 코드로 판정해야 한다.
		var ok = closingFails(200, null);
		var redirect = closingFails(302, "https://example.test/next");
		var redirectedOk = closingFails(200, null);
		var missing = closingFails(404, null);
		CloseableHttpClient client = mock(CloseableHttpClient.class);
		when(client.executeOpen(any(), any(), any())).thenReturn(ok, redirect, redirectedOk, missing);
		WebRiskClient risk = mock(WebRiskClient.class);
		when(risk.check(any())).thenReturn(new WebRiskClient.Result(false, Instant.now().plusSeconds(600)));
		HttpUrlProbe probe = new HttpUrlProbe(client, risk);
		try {
			assertThat(probe.isReachable("https://example.test/")).isTrue();
			assertThat(probe.isReachable("https://example.test/moved")).isTrue();
			assertThat(probe.isReachable("https://example.test/missing")).isFalse();
		} finally { probe.close(); }
	}

	private static ClassicHttpResponse closingFails(int status, String location) throws Exception {
		ClassicHttpResponse response = mock(ClassicHttpResponse.class);
		when(response.getCode()).thenReturn(status);
		when(response.getFirstHeader("Location")).thenReturn(location == null ? null : new BasicHeader("Location", location));
		doThrow(new SocketException("Socket closed")).when(response).close();
		return response;
	}

	@Test
	void redirectedMaliciousDestinationIsRejectedEvenIfInitialUrlIsClear() throws Exception {
		CloseableHttpClient client = mock(CloseableHttpClient.class);
		var redirect = new BasicClassicHttpResponse(302);
		redirect.addHeader("Location", "https://malicious.example.test/");
		when(client.executeOpen(any(), any(), any())).thenReturn(redirect);
		WebRiskClient risk = mock(WebRiskClient.class);
		when(risk.check("https://malicious.example.test/")).thenReturn(new WebRiskClient.Result(true, Instant.now().plusSeconds(600)));
		HttpUrlProbe probe = new HttpUrlProbe(client, risk);
		try {
			assertThatThrownBy(() -> probe.isReachable("https://initial.example.test/")).isInstanceOf(com.webter.global.exception.BusinessException.class);
		} finally { probe.close(); }
	}
}

package com.webter.domain.webservice.service;

import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.util.Timeout;
import org.springframework.stereotype.Component;

/** DNS 결과를 실제 연결에 사용하며 각 리디렉션도 다시 검증한다. TLS 호스트 검증은 기본값을 유지한다. */
@Component
public class HttpUrlProbe implements UrlProbe {

	private final CloseableHttpClient client;
	private final WebRiskClient webRisk;

	@org.springframework.beans.factory.annotation.Autowired
	public HttpUrlProbe(WebRiskClient webRisk) { this(defaultClient(new PublicDnsResolver()), webRisk); }

	HttpUrlProbe(CloseableHttpClient client, WebRiskClient webRisk) { this.client = client; this.webRisk = webRisk; }

	/**
	 * 응답 헤더 상한. 정상 사이트도 CSP 한 줄이 8KiB를 넘는 경우가 있어(예: Notion 약 8.9KiB) 여유를 둔다.
	 * 최악의 경우에도 검사 1건의 헤더는 수 MiB로 제한되고, 동시 검사 수와 시간 제한이 함께 적용된다.
	 */
	static final int MAX_HEADER_LINE = 32 * 1024;
	static final int MAX_HEADER_COUNT = 100;

	static CloseableHttpClient defaultClient(org.apache.hc.client5.http.DnsResolver resolver) { return HttpClients.custom()
		.setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
			.setConnectionFactory(org.apache.hc.client5.http.impl.io.ManagedHttpClientConnectionFactory.builder()
				.http1Config(org.apache.hc.core5.http.config.Http1Config.custom().setMaxHeaderCount(MAX_HEADER_COUNT)
					.setMaxLineLength(MAX_HEADER_LINE).build()).build())
			.setDnsResolver(resolver)
			.setDefaultConnectionConfig(ConnectionConfig.custom().setConnectTimeout(Timeout.ofSeconds(2))
				.setSocketTimeout(Timeout.ofSeconds(2)).build())
			.setMaxConnTotal(8).setMaxConnPerRoute(4).build())
		.setDefaultRequestConfig(RequestConfig.custom().setConnectionRequestTimeout(Timeout.ofSeconds(1))
			.setResponseTimeout(Timeout.ofSeconds(2)).build())
		.disableRedirectHandling().disableAutomaticRetries().disableCookieManagement().build(); }

	private final ThreadPoolExecutor workers = new ThreadPoolExecutor(4, 4, 0, TimeUnit.SECONDS,
		new ArrayBlockingQueue<>(4), Thread.ofPlatform().daemon().name("url-probe-", 0).factory(),
		new ThreadPoolExecutor.AbortPolicy());

	@Override
	public boolean isReachable(String url) {
		java.util.concurrent.Future<Boolean> task = null;
		var active = new java.util.concurrent.atomic.AtomicReference<HttpGet>();
		try {
			task = workers.submit(() -> probe(url, active));
			return task.get(5, TimeUnit.SECONDS);
		}
		catch (InterruptedException ex) { Thread.currentThread().interrupt(); return false; }
		catch (java.util.concurrent.ExecutionException ex) {
			if (ex.getCause() instanceof com.webter.global.exception.BusinessException failure) throw failure;
			return false;
		}
		catch (Exception ex) { return false; }
		finally {
			if (task != null && !task.isDone()) {
				task.cancel(true);
				HttpGet request = active.get();
				if (request != null) request.cancel();
			}
		}
	}

	private boolean probe(String url, java.util.concurrent.atomic.AtomicReference<HttpGet> active) throws Exception {
		URI target = URI.create(ServiceUrlPolicy.validateServiceUrl(url));
		for (int hop = 0; hop <= 3; hop++) {
			if (hop > 0 && webRisk.check(target.toString()).unsafe())
				throw new com.webter.global.exception.BusinessException(com.webter.domain.webservice.exception.ServiceErrorCode.UNSAFE_URL);
			HttpGet request = new HttpGet(target);
			active.set(request);
			if (Thread.currentThread().isInterrupted()) { request.cancel(); return false; }
			request.setHeader(HttpHeaders.USER_AGENT, "WEBTER-url-check");
			request.setHeader(HttpHeaders.CONNECTION, "close");
			int status;
			org.apache.hc.core5.http.Header location;
			try {
				var response = client.executeOpen(null, request, null);
				status = response.getCode();
				location = response.getFirstHeader(HttpHeaders.LOCATION);
				// 헤더만 읽고 연결을 끊는다. 큰 본문을 내려받거나 연결 재사용을 위해 소진하지 않는다.
				request.cancel();
				closeAfterCancel(response);
			}
			finally { request.cancel(); }
			// 로그인·권한이 필요한 서비스의 기존 등록 허용은 유지한다. 404·429·5xx는 거절한다.
			if ((status >= 200 && status < 300) || status == 401 || status == 403) return true;
			if (hop == 3 || !isRedirect(status) || location == null) return false;
			target = URI.create(ServiceUrlPolicy.validateServiceUrl(target.resolve(location.getValue()).toString()));
		}
		return false;
	}

	/**
	 * 끊긴 연결의 응답을 닫는다. 본문을 나눠 보내는(chunked) 응답은 닫을 때 남은 본문을 읽으려다 소켓 오류가 나므로
	 * 이미 읽은 상태 코드로 판정하고 그 오류는 무시한다.
	 */
	private static void closeAfterCancel(java.io.Closeable response) {
		try { response.close(); }
		catch (java.io.IOException ignored) { }
	}

	static boolean isRedirect(int status) { return status == 301 || status == 302 || status == 303 || status == 307 || status == 308; }

	@PreDestroy
	void close() throws java.io.IOException { workers.shutdownNow(); client.close(); }
}

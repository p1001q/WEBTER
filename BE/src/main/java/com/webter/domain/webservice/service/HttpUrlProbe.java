package com.webter.domain.webservice.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 서비스 주소로 GET 요청을 보내 응답이 오는지 확인한다(상태 코드가 500 미만이면 접속 가능).
 * 서버가 임의의 내부 주소를 호출하지 않도록 사설·루프백·링크 로컬 주소는 거절하고 리디렉션은 따라가지 않는다.
 * 확인한 주소와 실제 접속 주소가 달라질 수 있는 한계(DNS 재조회)가 있다.
 */
@Slf4j
@Component
public class HttpUrlProbe implements UrlProbe {

	private static final Duration TIMEOUT = Duration.ofSeconds(4);

	private final HttpClient client = HttpClient.newBuilder()
		.connectTimeout(TIMEOUT)
		.followRedirects(HttpClient.Redirect.NEVER)
		.build();

	@Override
	public boolean isReachable(String url) {
		try {
			URI uri = URI.create(url);
			if (!"https".equals(uri.getScheme()) || uri.getHost() == null || !isPublicHost(uri.getHost())) {
				return false;
			}
			HttpResponse<Void> response = client.send(
					HttpRequest.newBuilder(uri).timeout(TIMEOUT).header("User-Agent", "WEBTER-url-check").GET().build(),
					HttpResponse.BodyHandlers.discarding());
			return response.statusCode() < 500;
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			return false;
		}
		catch (Exception ex) {
			log.debug("서비스 주소 접속 확인 실패: {}", ex.getClass().getSimpleName());
			return false;
		}
	}

	// 이름에서 얻은 모든 주소가 공개 주소일 때만 접속한다
	static boolean isPublicHost(String host) throws java.io.IOException {
		for (InetAddress address : InetAddress.getAllByName(host)) {
			if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
					|| address.isSiteLocalAddress() || address.isMulticastAddress() || isUniqueLocalIpv6(address)) {
				return false;
			}
		}
		return true;
	}

	// IPv6 고유 로컬 주소(fc00::/7)
	private static boolean isUniqueLocalIpv6(InetAddress address) {
		byte[] bytes = address.getAddress();
		return bytes.length == 16 && (bytes[0] & 0xFE) == 0xFC;
	}

}

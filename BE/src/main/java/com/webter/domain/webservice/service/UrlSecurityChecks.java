package com.webter.domain.webservice.service;

import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.global.exception.BusinessException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** 최종 API에서도 정확한 URL의 유효한 서버 검사 결과를 요구한다. */
@Service
@RequiredArgsConstructor
public class UrlSecurityChecks {

	private final JdbcClient jdbc;
	private final WebRiskClient webRisk;
	private final UrlProbe probe;

	public void requireCached(String url) {
		String verdict = jdbc.sql("SELECT verdict FROM url_security_checks WHERE url_hash = :hash AND expires_at > clock_timestamp() AND reachable_until > clock_timestamp()")
			.param("hash", hash(url)).query(String.class).optional()
			.orElseThrow(() -> new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE));
		if (verdict.equals("UNSAFE")) throw new BusinessException(ServiceErrorCode.UNSAFE_URL);
	}

	public void requireChecked(String url) {
		String hash = hash(url);
		var cached = jdbc.sql("SELECT verdict FROM url_security_checks WHERE url_hash = :hash AND expires_at > clock_timestamp()")
			.param("hash", hash).query(String.class).optional();
		if (cached.isPresent()) {
			if (cached.get().equals("UNSAFE")) throw new BusinessException(ServiceErrorCode.UNSAFE_URL);
			boolean fresh = jdbc.sql("SELECT reachable_until > clock_timestamp() FROM url_security_checks WHERE url_hash = :hash")
				.param("hash", hash).query(Boolean.class).single();
			if (!fresh) {
				if (!probe.isReachable(url)) throw new BusinessException(ServiceErrorCode.URL_UNREACHABLE);
				jdbc.sql("UPDATE url_security_checks SET reachable_until = clock_timestamp() + interval '10 minutes' WHERE url_hash = :hash")
					.param("hash", hash).update();
			}
			requireCached(url);
			return;
		}
		if (!probe.isReachable(url)) throw new BusinessException(ServiceErrorCode.URL_UNREACHABLE);
		// 다른 인스턴스의 위험 판정이 만료된 경우에도 이전 메모리의 CLEAR를 재사용하지 않는다.
		webRisk.invalidate(url);
		var result = webRisk.check(url);
		Instant expiry = result.expiresAt().isBefore(Instant.now().plusSeconds(3600))
			? result.expiresAt() : Instant.now().plusSeconds(3600);
		if (!expiry.isAfter(Instant.now())) throw new BusinessException(ServiceErrorCode.URL_CHECK_UNAVAILABLE);
		jdbc.sql("""
			INSERT INTO url_security_checks(url_hash, verdict, checked_at, expires_at, reachable_until)
			VALUES (:hash, :verdict, clock_timestamp(), :expiry, clock_timestamp() + interval '10 minutes')
			ON CONFLICT (url_hash) DO UPDATE SET verdict = excluded.verdict,
			checked_at = excluded.checked_at, expires_at = excluded.expires_at, reachable_until = excluded.reachable_until
			WHERE url_security_checks.verdict <> 'UNSAFE' OR url_security_checks.expires_at <= clock_timestamp() OR excluded.verdict = 'UNSAFE'
			""").param("hash", hash).param("verdict", result.unsafe() ? "UNSAFE" : "CLEAR")
			.param("expiry", OffsetDateTime.ofInstant(expiry, java.time.ZoneOffset.UTC)).update();
		if (result.unsafe()) throw new BusinessException(ServiceErrorCode.UNSAFE_URL);
		requireCached(url);
	}

	private static String hash(String url) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(url.getBytes(StandardCharsets.UTF_8))); }
		catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
	}
}

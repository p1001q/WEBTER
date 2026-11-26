package com.webter.domain.webservice.service;

import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 하루 지난 공개 URL을 소량씩 재검사한다. 위험 판정은 기존 임시 숨김으로 전환하고 자동 복원하지 않는다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class UrlRecheckJob {
	private final JdbcClient jdbc;
	private final WebRiskClient webRisk;
	private final UrlSecurityChecks checks;

	@Scheduled(fixedDelayString = "${app.url-security.recheck-delay-ms:3600000}", initialDelayString = "${app.url-security.recheck-delay-ms:3600000}")
	public void recheck() {
		if (!webRisk.isConfigured()) return;
		var rows = jdbc.sql("SELECT service_id, service_url FROM services WHERE visibility_status = 'PUBLIC' AND (url_rechecked_at IS NULL OR url_rechecked_at < now() - interval '1 day') ORDER BY url_rechecked_at NULLS FIRST LIMIT 20")
			.query((rs, i) -> new Entry(rs.getLong(1), rs.getString(2))).list();
		for (Entry entry : rows) {
			try {
				checks.requireChecked(entry.url());
				jdbc.sql("UPDATE services SET url_checked_at = now() WHERE service_id = :id AND service_url = :url")
					.param("id", entry.id()).param("url", entry.url()).update();
			}
			catch (BusinessException ex) {
				if (ex.getErrorCode() == ServiceErrorCode.UNSAFE_URL) {
					jdbc.sql("UPDATE services SET visibility_status = 'TEMP_HIDDEN', hidden_reason = '보안 검사에서 위험한 사이트로 확인됐습니다.' WHERE service_id = :id AND service_url = :url AND visibility_status = 'PUBLIC'")
						.param("id", entry.id()).param("url", entry.url()).update();
					log.warn("보안 URL 차단: serviceId={}", entry.id());
				}
				else log.warn("URL 재검사 미완료: code={}", ex.getErrorCode().getCode());
			}
			catch (com.webter.global.security.AbuseProtection.LimitExceeded ex) { break; }
			finally {
				jdbc.sql("UPDATE services SET url_rechecked_at = now() WHERE service_id = :id AND service_url = :url")
					.param("id", entry.id()).param("url", entry.url()).update();
			}
		}
	}
	private record Entry(long id, String url) { }
}

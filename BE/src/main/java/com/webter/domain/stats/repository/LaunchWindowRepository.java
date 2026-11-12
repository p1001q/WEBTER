package com.webter.domain.stats.repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class LaunchWindowRepository {

	private final JdbcClient jdbc;

	public boolean reachesLimit(long serviceId, Key key, String value, Instant now) {
		// 기존 actor_key / ip_key 부분 인덱스로 해당 서비스의 최근 실행 기록만 확인한다.
		return jdbc.sql("""
				select count(*) filter (where occurred_at >= :minute) >= 9 or count(*) >= 19
				from (
					select occurred_at from service_events
					where service_id = :serviceId and event_type = 'LAUNCH' and %s = :value
					  and excluded_reason is distinct from 'SELF'
					  and occurred_at >= :fiveMinutes and occurred_at <= :now
					order by occurred_at desc limit 19
				) recent
				""".formatted(key.column))
			.param("serviceId", serviceId)
			.param("value", value)
			.param("minute", atUtc(now.minusSeconds(60)))
			.param("fiveMinutes", atUtc(now.minusSeconds(300)))
			.param("now", atUtc(now))
			.query(Boolean.class)
			.single();
	}

	public void block(long serviceId, String blockKey, Instant now) {
		jdbc.sql("""
				insert into service_count_blocks (service_id, actor_key, blocked_at, blocked_until, reason)
				values (:serviceId, :key, :now, :until, 'LAUNCH_RATE_LIMIT')
				on conflict (service_id, actor_key) do update
				set blocked_at = excluded.blocked_at, blocked_until = excluded.blocked_until, reason = excluded.reason
				""")
			.param("serviceId", serviceId)
			.param("key", blockKey)
			.param("now", atUtc(now))
			.param("until", atUtc(now.plusSeconds(3600)))
			.update();
	}

	private static OffsetDateTime atUtc(Instant instant) {
		return instant.atOffset(ZoneOffset.UTC);
	}

	public enum Key {
		ACTOR("actor_key"),
		IP("ip_key");

		private final String column;

		Key(String column) {
			this.column = column;
		}
	}

}

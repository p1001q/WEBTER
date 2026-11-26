package com.webter.global.security;

import com.webter.global.exception.BusinessException;
import com.webter.global.exception.ErrorCode;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** 운영은 Redis의 원자적 카운터를 쓴다. Redis 장애 시 제한을 생략하지 않는다. */
@Component
public class AbuseProtection {

	private static final DefaultRedisScript<Long> SCRIPT = new DefaultRedisScript<>("""
		local current = tonumber(redis.call('GET', KEYS[1]) or '0')
		if current >= tonumber(ARGV[1]) then return math.max(redis.call('PTTL', KEYS[1]), 1) end
		local n = redis.call('INCR', KEYS[1])
		if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
		return 0
		""", Long.class);
	private final ObjectProvider<StringRedisTemplate> redis;
	private final boolean local;
	private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();
	private final Environment env;

	public AbuseProtection(ObjectProvider<StringRedisTemplate> redis, Environment env) {
		this.redis = redis; this.env = env;
		local = env.acceptsProfiles(Profiles.of("local", "test"));
	}

	public int limit(String key, int fallback) { return Math.max(1, env.getProperty("app.abuse." + key, Integer.class, fallback)); }

	public void consume(String namespace, String subject, int max, Duration window) {
		String key = "webter:abuse:" + namespace + ":" + subject;
		long wait;
		try {
			StringRedisTemplate store = redis.getIfAvailable();
			if (store != null) {
				Long result = store.execute(SCRIPT, List.of(key), Integer.toString(max), Long.toString(window.toMillis()));
				if (result == null) throw new IllegalStateException("No counter result");
				wait = result;
			}
			else if (local) {
				long now = System.currentTimeMillis();
				if (counters.size() > 10_000) counters.entrySet().removeIf(e -> e.getValue().until <= now);
				if (counters.size() > 10_000 && !counters.containsKey(key)) throw new IllegalStateException("Counter capacity");
				Counter counter = counters.compute(key, (k, old) -> old == null || old.until <= now
					? new Counter(1, now + window.toMillis()) : new Counter(Math.min(old.count + 1, max + 1), old.until));
				wait = counter.count > max ? counter.until - now : 0;
			}
			else throw new IllegalStateException("Redis unavailable");
		}
		catch (Exception ex) { throw new BusinessException(ProtectionError.UNAVAILABLE); }
		if (wait > 0) throw new LimitExceeded(Math.max(1, (wait + 999) / 1000));
	}

	private record Counter(int count, long until) { }

	public static final class LimitExceeded extends RuntimeException {
		private final long retryAfter;
		LimitExceeded(long retryAfter) { this.retryAfter = retryAfter; }
		public long retryAfter() { return retryAfter; }
	}

	private enum ProtectionError implements ErrorCode {
		UNAVAILABLE;
		public HttpStatus getStatus() { return HttpStatus.SERVICE_UNAVAILABLE; }
		public String getCode() { return "COMMON_503_01"; }
		public String getMessage() { return "요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요."; }
	}
}

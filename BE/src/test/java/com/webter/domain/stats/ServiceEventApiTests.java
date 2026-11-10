package com.webter.domain.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.stats.entity.EventType;
import com.webter.domain.stats.service.ClientIpHmac;
import com.webter.domain.stats.service.ServiceEventService;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

class ServiceEventApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ClientIpHmac hmac;

	@Autowired
	ServiceEventService events;

	@Autowired
	PlatformTransactionManager transactions;

	@Test
	void blocksTenthLaunchByIpWithoutBlockingViewsOrOtherService() throws Exception {
		var owner = createUser("ev_owner");
		var first = createUser("ev_first");
		var second = createUser("ev_second");
		long sid = createService(owner, "https://example.com/ev-ip").getId();
		long other = createService(owner, "https://example.com/ev-other").getId();
		String ip = "203.0.113.10";
		record(sid, owner, "LAUNCH", ip);
		for (int i = 0; i < 9; i++) {
			record(sid, first, "LAUNCH", ip);
		}
		assertThat(count(sid, "is_counted and event_type = 'LAUNCH'")).isEqualTo(9);
		record(sid, second, "LAUNCH", ip);
		record(sid, second, "LAUNCH", ip);
		record(sid, second, "VIEW", ip);
		record(sid, owner, "VIEW", ip);
		record(other, second, "LAUNCH", ip);

		assertThat(count(sid, "excluded_reason = 'LAUNCH_RATE_LIMIT'")).isEqualTo(2);
		assertThat(count(sid, "excluded_reason = 'SELF'")).isEqualTo(2);
		assertThat(count(sid, "event_type = 'VIEW' and is_counted")).isEqualTo(1);
		assertThat(count(other, "is_counted")).isEqualTo(1);
		String ipHash = hmac.hash(ip);
		assertThat(ipHash).matches("[a-f0-9]{64}").isNotEqualTo(ip);
		assertThat(jdbc.queryForList("select distinct ip_key from service_events where service_id = ?", String.class, sid))
			.containsExactly(ipHash);
		assertThat(jdbc.queryForList("select actor_key from service_count_blocks where service_id = ?", String.class, sid))
			.containsExactly("ip:" + ipHash);
		assertThat(jdbc.queryForObject("""
				select extract(epoch from blocked_until - blocked_at)::int
				from service_count_blocks where service_id = ?
				""", Integer.class, sid)).isEqualTo(3600);
	}

	@Test
	void twentiethLaunchWithinFiveMinutesBlocksMemberAcrossAddressesAndAllowsAfterExpiry() throws Exception {
		var owner = createUser("ev_owner");
		var member = createUser("ev_member");
		long sid = createService(owner, "https://example.com/ev-five").getId();
		String actor = "user:" + member.getId();
		jdbc.update("""
				insert into service_events (service_id, user_id, actor_key, ip_key, event_type, occurred_at)
				select ?, ?, ?, ?, 'LAUNCH', statement_timestamp() - interval '2 minutes'
				from generate_series(1, 19)
				""", sid, member.getId(), actor, hmac.hash("203.0.113.20"));
		record(sid, member, "LAUNCH", "203.0.113.21");
		record(sid, member, "LAUNCH", "203.0.113.22");
		assertThat(count(sid, "excluded_reason = 'LAUNCH_RATE_LIMIT'")).isEqualTo(2);
		assertThat(jdbc.queryForList("select actor_key from service_count_blocks where service_id = ?", String.class, sid))
			.containsExactly(actor);
		jdbc.update("update service_count_blocks set blocked_at = ?, blocked_until = ? where service_id = ?",
			OffsetDateTime.now().minusHours(2), OffsetDateTime.now().minusHours(1), sid);
		jdbc.update("update service_events set occurred_at = statement_timestamp() - interval '6 minutes' where service_id = ?", sid);
		record(sid, member, "LAUNCH", "203.0.113.22");
		assertThat(count(sid, "is_counted")).isEqualTo(20);
	}

	@Test
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	void parallelLaunchesCannotBothPassTheSameThreshold() throws Exception {
		var tx = new TransactionTemplate(transactions);
		var fixture = tx.execute(status -> {
			var owner = createUser("ev_race_owner");
			var user = createUser("ev_race_member");
			return new ConcurrentFixture(createService(owner, "https://example.com/ev-parallel").getId(), owner.getId(), user.getId());
		});
		try {
			try (var pool = Executors.newFixedThreadPool(12)) {
				var ready = new CountDownLatch(1);
				var results = new ArrayList<java.util.concurrent.Future<?>>();
				for (int i = 0; i < 12; i++) {
					results.add(pool.submit(() -> {
						ready.await();
						events.record(fixture.sid(), fixture.member(), EventType.LAUNCH, "203.0.113.30");
						return null;
					}));
				}
				ready.countDown();
				for (var result : results) {
					result.get(20, TimeUnit.SECONDS);
				}
			}
			assertThat(count(fixture.sid(), "is_counted")).isEqualTo(9);
			assertThat(count(fixture.sid(), "excluded_reason = 'LAUNCH_RATE_LIMIT'")).isEqualTo(3);
		}
		finally {
			jdbc.update("delete from users where user_id in (?, ?)", fixture.owner(), fixture.member());
		}
	}

	private void record(long sid, User user, String type, String ip) throws Exception {
		mvc.perform(post("/api/services/{sid}/events/{type}", sid, type).with(as(user)).with(csrf())
			.with(request -> {
				request.setRemoteAddr(ip);
				request.addHeader("X-Forwarded-For", "198.51.100.200");
				return request;
			})).andExpect(status().isOk());
	}

	private long count(long sid, String condition) {
		return jdbc.queryForObject("select count(*) from service_events where service_id = ? and " + condition, Long.class, sid);
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

	private record ConcurrentFixture(long sid, UUID owner, UUID member) {
	}

}

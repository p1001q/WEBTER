package com.webter.domain.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.DomainFixtureTest;
import com.webter.domain.stats.entity.DailyUsage;
import com.webter.domain.stats.entity.DailyUsageId;
import com.webter.domain.stats.entity.ServiceCountBlock;
import com.webter.domain.stats.entity.UsageType;
import com.webter.domain.stats.repository.DailyUsageRepository;
import com.webter.domain.stats.repository.ServiceCountBlockRepository;
import com.webter.domain.webservice.entity.WebService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

// 클릭 집계 제한과 하루 사용량 엔티티가 스키마와 맞는지, 제한 유효 판정과 횟수 증가가 동작하는지 확인한다.
// DB 오류가 나면 같은 트랜잭션이 중단되므로 제약 위반 확인은 테스트마다 마지막에 한 번만 한다.
class CountBlockAndUsageEntitiesTests extends DomainFixtureTest {

	@Autowired
	ServiceCountBlockRepository blockRepository;

	@Autowired
	DailyUsageRepository usageRepository;

	@Test
	void blockIsActiveOnlyUntilItExpires() {
		WebService service = createService(createUser("owner"), "https://example.com/block");
		blockRepository.save(
				new ServiceCountBlock(service, "actor-1", Instant.now().plus(1, ChronoUnit.HOURS), "반복 클릭"));
		flushAndClear();

		assertThat(blockRepository.isBlocked(service.getId(), "actor-1", Instant.now())).isTrue();
		assertThat(blockRepository.isBlocked(service.getId(), "actor-1", Instant.now().plus(2, ChronoUnit.HOURS)))
			.isFalse();
		assertThat(blockRepository.isBlocked(service.getId(), "other-actor", Instant.now())).isFalse();
	}

	@Test
	void usageCountIncreases() {
		LocalDate today = LocalDate.now();
		DailyUsage usage = usageRepository.save(new DailyUsage("actor-1", today, UsageType.AI_SEARCH, null));
		usage.increase();
		usage.increase();
		flushAndClear();

		DailyUsage found = usageRepository.findById(new DailyUsageId("actor-1", today, UsageType.AI_SEARCH))
			.orElseThrow();

		assertThat(found.getUsedCount()).isEqualTo(2);
		assertThat(found.getUser()).isNull();
		assertThat(found.getUpdatedAt()).isNotNull();
	}

	@Test
	void serviceRegistrationUsageRequiresAMember() {
		assertThatThrownBy(() -> usageRepository.saveAndFlush(
				new DailyUsage("guest-actor", LocalDate.now(), UsageType.SERVICE_REGISTRATION, null)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

}

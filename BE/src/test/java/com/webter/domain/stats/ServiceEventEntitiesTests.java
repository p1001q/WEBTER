package com.webter.domain.stats;

import static org.assertj.core.api.Assertions.assertThat;

import com.webter.DomainFixtureTest;
import com.webter.domain.stats.entity.EventType;
import com.webter.domain.stats.entity.ServiceEvent;
import com.webter.domain.stats.repository.ServiceEventRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

// 조회·실행 기록 엔티티가 V1 스키마와 맞는지, 집계 포함 여부에 따라 기간 집계가 달라지는지 확인한다
class ServiceEventEntitiesTests extends DomainFixtureTest {

	@Autowired
	ServiceEventRepository eventRepository;

	@Test
	void guestEventIsStoredWithoutUser() {
		WebService service = createService(createUser("owner"), "https://example.com/events");
		ServiceEvent saved = eventRepository
			.save(ServiceEvent.counted(service, null, "guest-key", "ip-key", EventType.VIEW));
		flushAndClear();

		ServiceEvent found = eventRepository.findById(saved.getId()).orElseThrow();

		assertThat(found.getUser()).isNull();
		assertThat(found.getActorKey()).isEqualTo("guest-key");
		assertThat(found.getIpKey()).isEqualTo("ip-key");
		assertThat(found.getEventType()).isEqualTo(EventType.VIEW);
		assertThat(found.isCounted()).isTrue();
		assertThat(found.getExcludedReason()).isNull();
		assertThat(found.getOccurredAt()).isNotNull();
	}

	@Test
	void periodCountIncludesOnlyCountedEventsOfTheType() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/count");
		eventRepository.save(ServiceEvent.counted(service, owner, "a", "ip-a", EventType.LAUNCH));
		eventRepository.save(ServiceEvent.counted(service, null, "b", "ip-b", EventType.LAUNCH));
		eventRepository.save(ServiceEvent.excluded(service, null, "c", "ip-c", EventType.LAUNCH, "REPEAT_CLICK"));
		eventRepository.save(ServiceEvent.counted(service, null, "d", "ip-d", EventType.VIEW));
		flushAndClear();
		Instant since = Instant.now().minus(1, ChronoUnit.DAYS);

		assertThat(eventRepository.countCountedSince(service.getId(), EventType.LAUNCH, since)).isEqualTo(2);
		assertThat(eventRepository.countCountedSince(service.getId(), EventType.VIEW, since)).isEqualTo(1);
		assertThat(eventRepository.countCountedSince(service.getId(), EventType.LAUNCH, Instant.now().plusSeconds(60)))
			.isZero();
	}

	@Test
	void excludedEventKeepsItsReason() {
		WebService service = createService(createUser("owner"), "https://example.com/excluded");
		ServiceEvent saved = eventRepository.save(
				ServiceEvent.excluded(service, null, "bot", "ip-bot", EventType.LAUNCH, "REPEAT_CLICK"));
		flushAndClear();

		ServiceEvent found = eventRepository.findById(saved.getId()).orElseThrow();

		assertThat(found.isCounted()).isFalse();
		assertThat(found.getExcludedReason()).isEqualTo("REPEAT_CLICK");
	}

}

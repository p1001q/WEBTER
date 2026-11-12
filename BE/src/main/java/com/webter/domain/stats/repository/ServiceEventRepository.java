package com.webter.domain.stats.repository;

import com.webter.domain.stats.entity.EventType;
import com.webter.domain.stats.entity.ServiceEvent;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceEventRepository extends JpaRepository<ServiceEvent, Long> {

	// 집계에 포함된 기록만 기간 안에서 센다
	@Query("""
			select count(e) from ServiceEvent e
			where e.webService.id = :serviceId and e.eventType = :type and e.counted = true
			  and e.occurredAt >= :since
			""")
	long countCountedSince(@Param("serviceId") Long serviceId, @Param("type") EventType type,
			@Param("since") Instant since);

}

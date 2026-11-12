package com.webter.domain.stats.repository;

import com.webter.domain.stats.entity.ServiceCountBlock;
import com.webter.domain.stats.entity.ServiceCountBlockId;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceCountBlockRepository extends JpaRepository<ServiceCountBlock, ServiceCountBlockId> {

	// 지금 시각 기준으로 제한이 아직 유효한지 확인한다
	@Query("""
			select count(b) > 0 from ServiceCountBlock b
			where b.id.serviceId = :serviceId and b.id.actorKey = :actorKey and b.blockedUntil > :now
			""")
	boolean isBlocked(@Param("serviceId") Long serviceId, @Param("actorKey") String actorKey,
			@Param("now") Instant now);

}

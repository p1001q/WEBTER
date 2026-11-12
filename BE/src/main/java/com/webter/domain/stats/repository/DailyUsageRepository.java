package com.webter.domain.stats.repository;

import com.webter.domain.stats.entity.DailyUsage;
import com.webter.domain.stats.entity.DailyUsageId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyUsageRepository extends JpaRepository<DailyUsage, DailyUsageId> {

}

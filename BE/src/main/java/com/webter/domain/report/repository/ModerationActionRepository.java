package com.webter.domain.report.repository;

import com.webter.domain.report.entity.ModerationAction;
import com.webter.domain.report.entity.ReportTargetType;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, Long> {

	List<ModerationAction> findByTargetTypeAndTargetKeyOrderByCreatedAtDesc(ReportTargetType targetType,
			String targetKey);

	Slice<ModerationAction> findAllByOrderByCreatedAtDescIdDesc(Pageable page);

}

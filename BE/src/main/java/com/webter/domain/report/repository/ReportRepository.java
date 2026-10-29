package com.webter.domain.report.repository;

import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportStatus;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.user.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {

	List<Report> findByStatusOrderByCreatedAtAsc(ReportStatus status);

	// 같은 회원이 같은 대상을 다시 신고하지 못하게 확인할 때 쓴다
	boolean existsByReporterAndTargetTypeAndTargetKey(User reporter, ReportTargetType targetType, String targetKey);

	// 자동 임시 비공개 기준(신고 몇 건 이상)을 판단할 때 쓴다
	long countByTargetTypeAndTargetKey(ReportTargetType targetType, String targetKey);

}

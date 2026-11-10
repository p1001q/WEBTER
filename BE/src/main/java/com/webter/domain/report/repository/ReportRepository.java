package com.webter.domain.report.repository;

import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportStatus;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.user.entity.User;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ReportRepository extends JpaRepository<Report, Long> {

	List<Report> findByStatusOrderByCreatedAtAsc(ReportStatus status);

	// 같은 회원이 같은 대상을 다시 신고하지 못하게 확인할 때 쓴다
	boolean existsByReporterAndTargetTypeAndTargetKey(User reporter, ReportTargetType targetType, String targetKey);

	// 자동 임시 비공개 기준(신고 몇 건 이상)을 판단할 때 쓴다
	long countByTargetTypeAndTargetKey(ReportTargetType targetType, String targetKey);

	long countByStatus(ReportStatus status);

	long countByTargetTypeAndTargetKeyAndStatus(ReportTargetType type, String key, ReportStatus status);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	List<Report> findByTargetTypeAndTargetKeyAndStatusOrderById(ReportTargetType type, String key, ReportStatus status);

	Slice<Report> findByTargetTypeAndTargetKeyOrderByCreatedAtDescIdDesc(ReportTargetType type, String key, Pageable page);

	@Query("""
		select r.reasonCode as reason, count(r) as count
		from Report r where r.targetType = :type and r.targetKey = :key
		group by r.reasonCode order by count(r) desc, r.reasonCode
		""")
	List<ReasonRow> summarizeReasons(ReportTargetType type, String key);

	@Query("""
		select r.targetType as targetType, r.targetKey as targetKey, count(r) as total,
			sum(case when r.status = OPEN then 1 else 0 end) as pending, max(r.createdAt) as latestAt
		from Report r group by r.targetType, r.targetKey
		having :pendingOnly = false or sum(case when r.status = OPEN then 1 else 0 end) > 0
		order by max(r.createdAt) desc, r.targetType, r.targetKey
		""")
	Slice<GroupRow> groups(boolean pendingOnly, Pageable page);

	interface ReasonRow {

		String getReason();

		long getCount();

	}

	interface GroupRow {

		ReportTargetType getTargetType();

		String getTargetKey();

		long getTotal();

		long getPending();

		Instant getLatestAt();

	}

}

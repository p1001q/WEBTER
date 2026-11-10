package com.webter.domain.report.service;

import static com.webter.domain.report.entity.ReportStatus.OPEN;
import static com.webter.domain.report.repository.ReportTargetStore.ref;
import static com.webter.global.entity.VisibilityStatus.PUBLIC;
import static com.webter.global.entity.VisibilityStatus.TEMP_HIDDEN;

import com.webter.domain.report.dto.ReportInput;
import com.webter.domain.report.entity.ModerationAction;
import com.webter.domain.report.entity.ReportReason;
import com.webter.domain.report.exception.ReportErrorCode;
import com.webter.domain.report.repository.ModerationActionRepository;
import com.webter.domain.report.repository.ReportRepository;
import com.webter.domain.report.repository.ReportTargetStore;
import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

	private static final String AUTO_HIDE_REASON = "신고가 누적되어 검토 중이에요.";

	private final ReportRepository reports;
	private final ModerationActionRepository actions;
	private final ReportTargetStore targets;
	private final UserRepository users;
	private final int hideThreshold;

	public ReportService(ReportRepository reports, ModerationActionRepository actions, ReportTargetStore targets,
			UserRepository users, @Value("${app.report.hide-threshold:4}") int hideThreshold) {
		if (hideThreshold < 1) {
			throw new IllegalArgumentException("app.report.hide-threshold must be positive");
		}
		this.reports = reports;
		this.actions = actions;
		this.targets = targets;
		this.users = users;
		this.hideThreshold = hideThreshold;
	}

	@Transactional
	public Receipt submit(UUID reporterId, ReportInput input) {
		if (reporterId == null) {
			throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
		}
		var reporter = users.findById(reporterId)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
		if (reporter.getAccountStatus() == AccountStatus.SUSPENDED) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		if (!input.reason().appliesTo(input.targetType())) {
			throw new BusinessException(ReportErrorCode.INVALID_REASON);
		}
		String detail = input.detail() == null || input.detail().isBlank() ? null : input.detail().strip();
		if (input.reason() == ReportReason.OTHER && detail == null) {
			throw new BusinessException(ReportErrorCode.DETAIL_REQUIRED);
		}
		var ref = ref(input.targetType(), input.targetId());
		var target = targets.lock(ref).orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		if (reports.existsByReporterAndTargetTypeAndTargetKey(reporter, ref.targetType(), ref.targetId())) {
			throw new BusinessException(ReportErrorCode.ALREADY_REPORTED);
		}
		if (!target.parentPublic() || target.preview().visibility() != PUBLIC) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}

		var report = reports.save(target.newReport(reporter, input.reason().name(), detail));
		// 회원마다 한 건이라는 유일 제약이 있다. 탈퇴로 reporter_id가 비워진 행도 한 건씩 센다.
		boolean hidden = reports.countByTargetTypeAndTargetKeyAndStatus(ref.targetType(), ref.targetId(), OPEN)
			>= hideThreshold;
		if (hidden) {
			targets.changeVisibility(ref, TEMP_HIDDEN, AUTO_HIDE_REASON);
			actions.save(ModerationAction.builder().targetType(ref.targetType()).targetKey(ref.targetId())
				.report(report).actionType("TEMP_HIDE").reason(AUTO_HIDE_REASON).automatic(true).build());
		}
		return new Receipt(report.getId().toString(), hidden);
	}

	public record Receipt(String id, boolean temporarilyHidden) {
	}
}

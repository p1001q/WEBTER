package com.webter.domain.report.service;

import static com.webter.domain.report.dto.ModerationInput.Decision.DISMISS;
import static com.webter.domain.report.entity.ReportStatus.OPEN;
import static com.webter.global.entity.VisibilityStatus.HIDDEN;
import static com.webter.global.entity.VisibilityStatus.PUBLIC;
import static com.webter.global.entity.VisibilityStatus.TEMP_HIDDEN;

import com.webter.domain.report.dto.ModerationInput.Resolve;
import com.webter.domain.report.dto.ModerationInput.SanctionMember;
import com.webter.domain.report.dto.ModerationView.Action;
import com.webter.domain.report.dto.ModerationView.Detail;
import com.webter.domain.report.dto.ModerationView.HiddenTarget;
import com.webter.domain.report.dto.ModerationView.Page;
import com.webter.domain.report.dto.ModerationView.Queue;
import com.webter.domain.report.dto.ModerationView.ReasonCount;
import com.webter.domain.report.dto.ModerationView.ReportEntry;
import com.webter.domain.report.dto.ModerationView.ReportGroup;
import com.webter.domain.notification.entity.NotificationType;
import com.webter.domain.notification.service.NotificationPublisher;
import com.webter.domain.report.dto.ModerationView.TargetRef;
import com.webter.domain.report.entity.ModerationAction;
import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.report.exception.ReportErrorCode;
import com.webter.domain.report.repository.ModerationActionRepository;
import com.webter.domain.report.repository.ReportRepository;
import com.webter.domain.report.repository.ReportTargetStore;
import com.webter.domain.report.repository.ReportTargetStore.Target;
import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserRole;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminModerationService {

	private final ReportRepository reports;
	private final ModerationActionRepository actions;
	private final ReportTargetStore targets;
	private final UserRepository users;
	private final NotificationPublisher notifications;

	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public Queue queue(UUID adminId, boolean pendingOnly, int page) {
		requireAdmin(adminId);
		var groups = reports.groups(pendingOnly, page(page)).map(row -> new ReportGroup(
			new TargetRef(row.getTargetType(), row.getTargetKey()), row.getTotal(), row.getPending(), row.getLatestAt()));
		return new Queue(Page.of(groups), reports.countByStatus(OPEN));
	}

	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public Detail detail(UUID adminId, TargetRef ref, int page) {
		requireAdmin(adminId);
		var type = ref.targetType();
		var key = ref.targetId();
		var preview = targets.find(ref).map(Target::preview).orElse(null);
		var reasons = reports.summarizeReasons(type, key).stream()
			.map(row -> new ReasonCount(row.getReason(), row.getCount())).toList();
		long total = reasons.stream().mapToLong(ReasonCount::count).sum();
		if (preview == null && total == 0) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
		var entries = reports.findByTargetTypeAndTargetKeyOrderByCreatedAtDescIdDesc(type, key, page(page))
			.map(ReportEntry::of);
		return new Detail(ref, preview, total, reports.countByTargetTypeAndTargetKeyAndStatus(type, key, OPEN),
			reasons, Page.of(entries));
	}

	@Transactional(readOnly = true)
	public Page<HiddenTarget> temporarilyHidden(UUID adminId, int page) {
		requireAdmin(adminId);
		return Page.of(targets.temporarilyHidden(page(page)));
	}

	@Transactional(readOnly = true)
	public Page<Action> history(UUID adminId, int page) {
		requireAdmin(adminId);
		return Page.of(actions.findAllByOrderByCreatedAtDescIdDesc(page(page)).map(Action::of));
	}

	@Transactional
	public Action resolve(UUID adminId, TargetRef ref, Resolve input) {
		User admin = requireAdmin(adminId);
		var target = targets.lock(ref);
		var open = reports.findByTargetTypeAndTargetKeyAndStatusOrderById(ref.targetType(), ref.targetId(), OPEN);
		var decision = input.action();
		String reason = input.reason().strip();
		if (target.isEmpty() && decision != DISMISS) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}

		var visibility = target.map(t -> t.preview().visibility()).orElse(null);
		switch (decision) {
			case RESTORE -> {
				requireAvailable(visibility != PUBLIC);
				targets.changeVisibility(ref, PUBLIC, null);
				open.forEach(report -> report.dismiss(admin, reason));
				if (ref.targetType() == ReportTargetType.SERVICE && visibility == TEMP_HIDDEN) {
					notifications.serviceModerated(NotificationType.SERVICE_UNHIDDEN, target.orElseThrow().rowId(), null);
				}
			}
			case HIDE -> {
				requireAvailable(visibility != HIDDEN);
				targets.changeVisibility(ref, HIDDEN, reason);
				open.forEach(report -> report.resolve(admin, reason));
				if (ref.targetType() == ReportTargetType.SERVICE) {
					notifications.serviceModerated(NotificationType.SERVICE_BLOCKED, target.orElseThrow().rowId(), reason);
				}
			}
			case DELETE -> {
				requireAvailable(ref.targetType() != ReportTargetType.PROFILE);
				open.forEach(report -> report.resolve(admin, reason));
				// 삭제 시 DB가 대상 외래키를 비우기 전에 관리자의 처리 상태를 먼저 저장한다.
				reports.flush();
				targets.delete(target.orElseThrow());
			}
			case DISMISS -> {
				requireAvailable(!open.isEmpty());
				open.forEach(report -> report.dismiss(admin, reason));
			}
		}
		Report basis = open.isEmpty() ? null : open.getFirst();
		return record(ref, admin, basis, decision.name(), reason);
	}

	@Transactional
	public Action sanction(UUID adminId, UUID memberId, SanctionMember input) {
		User admin = requireAdmin(adminId);
		User member = users.findLockedById(memberId).orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		if (member.getRole() == UserRole.ADMIN) {
			throw new BusinessException(ReportErrorCode.ADMIN_SANCTION_NOT_AVAILABLE);
		}
		String reason = input.reason().strip();
		switch (input.action()) {
			case WARNING -> { /* 경고는 조치 이력만 남기고 현재 제한을 유지한다. */ }
			case REGISTRATION_RESTRICTED -> {
				requireAvailable(member.getAccountStatus() == AccountStatus.ACTIVE);
				member.restrict(AccountStatus.REGISTRATION_RESTRICTED, reason);
				notifications.registrationRestricted(member, reason);
			}
			case SUSPENDED -> {
				requireAvailable(member.getAccountStatus() != AccountStatus.SUSPENDED);
				member.restrict(AccountStatus.SUSPENDED, reason);
			}
		}
		return record(new TargetRef(ReportTargetType.PROFILE, memberId.toString()), admin, null, input.action().name(),
			reason);
	}

	private Action record(TargetRef ref, User admin, Report basis, String type, String reason) {
		return Action.of(actions.save(ModerationAction.builder().targetType(ref.targetType()).targetKey(ref.targetId())
			.actor(admin).report(basis).actionType(type).reason(reason).build()));
	}

	private User requireAdmin(UUID id) {
		if (id == null) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		return users.findById(id)
			.filter(user -> user.getRole() == UserRole.ADMIN && user.getAccountStatus() != AccountStatus.SUSPENDED)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.FORBIDDEN));
	}

	private static void requireAvailable(boolean allowed) {
		if (!allowed) {
			throw new BusinessException(ReportErrorCode.ACTION_NOT_AVAILABLE);
		}
	}

	private static PageRequest page(int page) {
		if (page < 0 || page > 100_000) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		return PageRequest.of(page, 20);
	}
}

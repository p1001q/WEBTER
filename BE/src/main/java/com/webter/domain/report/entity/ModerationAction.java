package com.webter.domain.report.entity;

import com.webter.domain.user.entity.User;
import com.webter.global.entity.BaseCreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 운영 조치 이력(임시 비공개, 복구 등). 신고 누적으로 시스템이 자동 처리한 것은 automatic으로 구분한다.
 * 대상이 삭제돼도 이력이 남도록 대상은 종류와 신고 당시 값(targetKey)으로만 기록한다.
 */
@Getter
@Entity
@Table(name = "moderation_actions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ModerationAction extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "moderation_action_id")
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 20)
	private ReportTargetType targetType;

	@Column(name = "target_key", nullable = false)
	private String targetKey;

	// 근거가 된 신고. 신고가 삭제되면 비어 있다.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "report_id")
	private Report report;

	// 처리한 관리자. 자동 처리이거나 관리자가 탈퇴하면 비어 있다.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "actor_id")
	private User actor;

	@Column(name = "action_type", nullable = false, length = 40)
	private String actionType;

	@Column(nullable = false)
	private String reason;

	@Column(name = "is_automatic", nullable = false)
	private boolean automatic = false;

	@Builder
	private ModerationAction(ReportTargetType targetType, String targetKey, Report report, User actor,
			String actionType, String reason, boolean automatic) {
		this.targetType = targetType;
		this.targetKey = targetKey;
		this.report = report;
		this.actor = actor;
		this.actionType = actionType;
		this.reason = reason;
		this.automatic = automatic;
	}

}

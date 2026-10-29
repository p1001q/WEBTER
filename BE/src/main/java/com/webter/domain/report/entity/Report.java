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
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 콘텐츠 신고. 대상 종류마다 대상 ID 컬럼이 따로 있고, 신고 한 건은 그중 하나만 채운다(나머지는 비어 있다).
 * 대상이 삭제되면 DB가 해당 ID 컬럼만 비우고, 신고 당시의 대상 값(targetKey)은 그대로 남는다.
 * 대상 종류와 ID의 짝이 어긋나지 않도록 forService, forReview 같은 생성 메서드로만 만든다.
 */
@Getter
@Entity
@Table(name = "reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "report_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reporter_id")
	private User reporter;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 20)
	private ReportTargetType targetType;

	// 신고 당시 대상의 ID 문자열. 대상이 삭제된 뒤에도 남는다.
	@Column(name = "target_key", nullable = false)
	private String targetKey;

	@Column(name = "target_service_id")
	private Long targetServiceId;

	@Column(name = "target_review_id")
	private Long targetReviewId;

	// reviews.reply_id를 가리킨다
	@Column(name = "target_review_reply_id")
	private UUID targetReviewReplyId;

	@Column(name = "target_comment_id")
	private Long targetCommentId;

	@Column(name = "target_user_id")
	private UUID targetUserId;

	@Column(name = "reason_code", nullable = false, length = 40)
	private String reasonCode;

	private String detail;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ReportStatus status = ReportStatus.OPEN;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reviewed_by")
	private User reviewedBy;

	@Column(name = "reviewed_at")
	private Instant reviewedAt;

	@Column(name = "resolution_note")
	private String resolutionNote;

	private Report(User reporter, ReportTargetType targetType, String targetKey, String reasonCode, String detail) {
		this.reporter = reporter;
		this.targetType = targetType;
		this.targetKey = targetKey;
		this.reasonCode = reasonCode;
		this.detail = detail;
	}

	public static Report forService(User reporter, Long serviceId, String reasonCode, String detail) {
		Report report = new Report(reporter, ReportTargetType.SERVICE, String.valueOf(serviceId), reasonCode, detail);
		report.targetServiceId = serviceId;
		return report;
	}

	public static Report forReview(User reporter, Long reviewId, String reasonCode, String detail) {
		Report report = new Report(reporter, ReportTargetType.REVIEW, String.valueOf(reviewId), reasonCode, detail);
		report.targetReviewId = reviewId;
		return report;
	}

	public static Report forReviewReply(User reporter, UUID replyId, String reasonCode, String detail) {
		Report report = new Report(reporter, ReportTargetType.REVIEW_REPLY, replyId.toString(), reasonCode, detail);
		report.targetReviewReplyId = replyId;
		return report;
	}

	public static Report forComment(User reporter, Long commentId, String reasonCode, String detail) {
		Report report = new Report(reporter, ReportTargetType.COMMENT, String.valueOf(commentId), reasonCode, detail);
		report.targetCommentId = commentId;
		return report;
	}

	public static Report forProfile(User reporter, UUID userId, String reasonCode, String detail) {
		Report report = new Report(reporter, ReportTargetType.PROFILE, userId.toString(), reasonCode, detail);
		report.targetUserId = userId;
		return report;
	}

	/** 위반을 확인해 조치한 것으로 처리한다. */
	public void resolve(User admin, String note) {
		close(ReportStatus.RESOLVED, admin, note);
	}

	/** 위반이 아니라고 보고 기각한다. */
	public void dismiss(User admin, String note) {
		close(ReportStatus.DISMISSED, admin, note);
	}

	private void close(ReportStatus status, User admin, String note) {
		this.status = status;
		this.reviewedBy = admin;
		this.reviewedAt = Instant.now();
		this.resolutionNote = note;
	}

}

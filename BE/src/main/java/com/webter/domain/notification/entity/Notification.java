package com.webter.domain.notification.entity;

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
 * 사이트 내 알림. 종류마다 채우는 대상 ID가 다르므로 종류별 생성 메서드로만 만든다.
 * 대상이 삭제되면 DB가 해당 ID만 비운다.
 */
@Getter
@Entity
@Table(name = "notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "notification_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recipient_id", nullable = false)
	private User recipient;

	// 알림을 일으킨 회원. 탈퇴하면 비어 있다.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "actor_id")
	private User actor;

	@Enumerated(EnumType.STRING)
	@Column(name = "notification_type", nullable = false, length = 30)
	private NotificationType type;

	@Column(name = "target_service_id")
	private Long targetServiceId;

	@Column(name = "target_comment_id")
	private Long targetCommentId;

	@Column(name = "target_review_id")
	private Long targetReviewId;

	// reviews.reply_id를 가리킨다
	@Column(name = "target_reply_id")
	private UUID targetReplyId;

	@Column(name = "target_invitation_id")
	private Long targetInvitationId;

	// 운영 처리 알림이 가리키는 대상 종류(SERVICE·REVIEW·REVIEW_REPLY·COMMENT·PROFILE)와 처리 사유
	@Column(name = "target_kind", length = 20)
	private String targetKind;

	@Column(name = "reason")
	private String reason;

	@Column(name = "read_at")
	private Instant readAt;

	private Notification(User recipient, User actor, NotificationType type, Long targetServiceId) {
		this.recipient = recipient;
		this.actor = actor;
		this.type = type;
		this.targetServiceId = targetServiceId;
	}

	/** 내 서비스에 리뷰가 달림. 익명·비회원 리뷰는 actor를 비운다. */
	public static Notification reviewCreated(User recipient, User actor, Long serviceId, Long reviewId) {
		Notification notification = new Notification(recipient, actor, NotificationType.REVIEW_CREATED, serviceId);
		notification.targetReviewId = reviewId;
		return notification;
	}

	/** 내 서비스에 댓글이 달림. 익명 댓글은 actor를 비운다. */
	public static Notification commentCreated(User recipient, User actor, Long serviceId, Long commentId) {
		Notification notification = new Notification(recipient, actor, NotificationType.COMMENT_CREATED, serviceId);
		notification.targetCommentId = commentId;
		return notification;
	}

	/** 초대에 대한 수락·거절 결과를 초대한 사람에게 알린다. */
	public static Notification teamInvitationResult(User recipient, User actor, Long serviceId, Long invitationId,
			boolean accepted) {
		NotificationType type = accepted ? NotificationType.TEAM_INVITATION_ACCEPTED
				: NotificationType.TEAM_INVITATION_DECLINED;
		Notification notification = new Notification(recipient, actor, type, serviceId);
		notification.targetInvitationId = invitationId;
		return notification;
	}

	/** 서비스 임시 비공개·해제·최종 비공개. 최종 비공개는 사유를 함께 알린다. */
	public static Notification serviceModeration(NotificationType type, User recipient, Long serviceId, String reason) {
		Notification notification = new Notification(recipient, null, type, serviceId);
		notification.targetKind = "SERVICE";
		notification.reason = limit(reason);
		return notification;
	}

	/** 내 리뷰·제작자 답글·댓글·프로필의 임시 비공개. 대상 종류로 구분한다. */
	public static Notification contentHidden(User recipient, String kind, Long serviceId, Long reviewId,
			Long commentId) {
		Notification notification = new Notification(recipient, null, NotificationType.CONTENT_HIDDEN, serviceId);
		notification.targetKind = kind;
		notification.targetReviewId = reviewId;
		notification.targetCommentId = commentId;
		return notification;
	}

	/** 서비스 등록 제한과 사유 안내. */
	public static Notification registrationRestricted(User recipient, String reason) {
		Notification notification = new Notification(recipient, null, NotificationType.REGISTRATION_RESTRICTED, null);
		notification.reason = limit(reason);
		return notification;
	}

	private static String limit(String reason) {
		return reason == null || reason.length() <= 500 ? reason : reason.substring(0, 500);
	}

	public static Notification commentReply(User recipient, User actor, Long serviceId, Long commentId) {
		Notification notification = new Notification(recipient, actor, NotificationType.COMMENT_REPLY, serviceId);
		notification.targetCommentId = commentId;
		return notification;
	}

	public static Notification reviewReply(User recipient, User actor, Long serviceId, Long reviewId, UUID replyId) {
		Notification notification = new Notification(recipient, actor, NotificationType.REVIEW_REPLY, serviceId);
		notification.targetReviewId = reviewId;
		notification.targetReplyId = replyId;
		return notification;
	}

	public static Notification teamInvitation(User recipient, User actor, Long serviceId, Long invitationId) {
		Notification notification = new Notification(recipient, actor, NotificationType.TEAM_INVITATION, serviceId);
		notification.targetInvitationId = invitationId;
		return notification;
	}

	public void markRead() {
		if (readAt == null) {
			this.readAt = Instant.now();
		}
	}

}

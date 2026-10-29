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
 * 사이트 내 알림. 종류마다 채우는 대상 ID가 다르고 DB가 짝을 검사하므로
 * commentReply, reviewReply, teamInvitation 생성 메서드로만 만든다.
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

	@Column(name = "read_at")
	private Instant readAt;

	private Notification(User recipient, User actor, NotificationType type, Long targetServiceId) {
		this.recipient = recipient;
		this.actor = actor;
		this.type = type;
		this.targetServiceId = targetServiceId;
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

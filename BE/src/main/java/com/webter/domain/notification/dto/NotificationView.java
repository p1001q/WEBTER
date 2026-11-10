package com.webter.domain.notification.dto;

import com.webter.domain.notification.entity.NotificationType;
import com.webter.domain.team.entity.InvitationStatus;
import java.time.Instant;

/**
 * 알림 한 건. 대상이 삭제됐으면 해당 ID와 quote는 null이다. 익명·비회원·탈퇴한 회원이 일으킨 알림은 actor가 null이다.
 * 운영 처리 알림(임시 비공개 등)은 actor 없이 serviceId만 채운다.
 */
public record NotificationView(String id, NotificationType type, Actor actor, String serviceId, String serviceName,
		String reviewId, String commentId, String quote, Invitation invitation, boolean read, Instant createdAt) {

	public record Actor(String id, String username, String nickname) {
	}

	/** 팀 초대 알림에서 초대의 현재 상태. 수락·거절 후에도 알림은 남고 상태만 바뀐다. */
	public record Invitation(String id, InvitationStatus status) {
	}

}

package com.webter.domain.notification.service;

import com.webter.domain.notification.dto.NotificationView;
import com.webter.domain.notification.entity.Notification;
import com.webter.domain.notification.entity.NotificationType;
import com.webter.domain.notification.exception.NotificationErrorCode;
import com.webter.domain.notification.repository.NotificationRepository;
import com.webter.domain.reaction.dto.CursorPage;
import com.webter.domain.reaction.dto.CursorPage.Position;
import com.webter.domain.team.entity.InvitationStatus;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.team.repository.ServiceInvitationRepository;
import com.webter.domain.user.entity.User;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 내 알림 조회·읽음·삭제. 본인 알림만 다룬다. */
@Service
@RequiredArgsConstructor
public class NotificationService {

	private static final Instant MAX_DATE = Instant.parse("9999-12-31T23:59:59Z");

	private static final int QUOTE_LENGTH = 100;

	private final NotificationRepository notifications;

	private final ServiceInvitationRepository invitations;

	private final EntityManager em;

	@Transactional(readOnly = true)
	public CursorPage<NotificationView> list(UUID userId, boolean unreadOnly, String cursor, int limit) {
		CursorPage.checkLimit(limit);
		String scope = "notification:" + userId + ":" + unreadOnly;
		Position after = Position.decode(cursor, scope);
		var rows = notifications.findPage(userId, unreadOnly, after == null ? MAX_DATE : after.date(),
				after == null ? Long.MAX_VALUE : after.id(), PageRequest.ofSize(limit + 1));
		var page = rows.subList(0, Math.min(rows.size(), limit));
		var views = toViews(page);
		var last = page.isEmpty() ? null : page.getLast();
		return new CursorPage<>(views,
				rows.size() > limit ? new Position(last.getCreatedAt(), last.getId(), 0).encode(scope) : null);
	}

	@Transactional(readOnly = true)
	public long unreadCount(UUID userId) {
		return notifications.countByRecipient_IdAndReadAtIsNull(userId);
	}

	@Transactional
	public void markRead(UUID userId, long id) {
		find(userId, id).markRead();
	}

	@Transactional
	public void markAllRead(UUID userId) {
		notifications.markAllRead(userId, Instant.now());
	}

	/** 한 건 삭제. 대기 중인 초대 알림은 수락·거절 전에 지울 수 없다. */
	@Transactional
	public void delete(UUID userId, long id) {
		Notification notification = find(userId, id);
		if (notification.getType() == NotificationType.TEAM_INVITATION && notification.getTargetInvitationId() != null
				&& invitations.findById(notification.getTargetInvitationId())
					.map(i -> i.getStatus() == InvitationStatus.PENDING)
					.orElse(false)) {
			throw new BusinessException(NotificationErrorCode.PENDING_INVITATION);
		}
		notifications.delete(notification);
	}

	/** 지울 수 있는 알림을 모두 지운다(대기 중인 초대 알림은 남는다). */
	@Transactional
	public void deleteAll(UUID userId) {
		notifications.deleteAllHandled(userId);
	}

	private Notification find(UUID userId, long id) {
		return notifications.findByIdAndRecipient_Id(id, userId)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
	}

	private List<NotificationView> toViews(List<Notification> page) {
		Set<Long> serviceIds = new HashSet<>();
		Set<Long> reviewIds = new HashSet<>();
		Set<Long> commentIds = new HashSet<>();
		Set<Long> invitationIds = new HashSet<>();
		for (Notification n : page) {
			add(serviceIds, n.getTargetServiceId());
			add(reviewIds, n.getTargetReviewId());
			add(commentIds, n.getTargetCommentId());
			add(invitationIds, n.getTargetInvitationId());
		}
		Map<Long, String> serviceNames = names("select s.id, s.name from WebService s where s.id in :ids", serviceIds);
		Map<Long, String> reviewQuotes = names("""
				select r.id, r.content from Review r
				where r.id in :ids and r.visibilityStatus = com.webter.global.entity.VisibilityStatus.PUBLIC
				""", reviewIds);
		Map<Long, String> commentQuotes = names("""
				select c.id, c.content from ServiceComment c
				where c.id in :ids and c.deletedAt is null
				  and c.visibilityStatus = com.webter.global.entity.VisibilityStatus.PUBLIC
				""", commentIds);
		Map<Long, ServiceInvitation> invitationById = new HashMap<>();
		if (!invitationIds.isEmpty()) {
			invitations.findAllById(invitationIds).forEach(i -> invitationById.put(i.getId(), i));
		}
		return page.stream().map(n -> {
			String quote = n.getTargetCommentId() != null ? commentQuotes.get(n.getTargetCommentId())
					: n.getTargetReviewId() != null ? reviewQuotes.get(n.getTargetReviewId()) : null;
			ServiceInvitation invitation = n.getTargetInvitationId() == null ? null
					: invitationById.get(n.getTargetInvitationId());
			return new NotificationView(String.valueOf(n.getId()), n.getType(), actor(n.getActor()),
					text(n.getTargetServiceId()), serviceNames.get(n.getTargetServiceId()),
					text(n.getTargetReviewId()), text(n.getTargetCommentId()), shorten(quote), n.getTargetKind(),
					n.getReason(),
					invitation == null ? null
							: new NotificationView.Invitation(String.valueOf(invitation.getId()), invitation.getStatus()),
					n.getReadAt() != null, n.getCreatedAt());
		}).toList();
	}

	private Map<Long, String> names(String jpql, Set<Long> ids) {
		Map<Long, String> result = new HashMap<>();
		if (ids.isEmpty()) {
			return result;
		}
		List<?> rows = em.createQuery(jpql).setParameter("ids", ids).getResultList();
		for (Object row : rows) {
			Object[] cols = (Object[]) row;
			result.put((Long) cols[0], (String) cols[1]);
		}
		return result;
	}

	private static NotificationView.Actor actor(User actor) {
		if (actor == null || actor.getVisibilityStatus() != VisibilityStatus.PUBLIC) {
			return null;
		}
		return new NotificationView.Actor(actor.getId().toString(), actor.getUsername(), actor.getPublicNickname());
	}

	private static void add(Set<Long> ids, Long id) {
		if (id != null) {
			ids.add(id);
		}
	}

	private static String text(Long id) {
		return id == null ? null : String.valueOf(id);
	}

	private static String shorten(String text) {
		if (text == null || text.codePointCount(0, text.length()) <= QUOTE_LENGTH) {
			return text;
		}
		return text.substring(0, text.offsetByCodePoints(0, QUOTE_LENGTH)) + "…";
	}

}

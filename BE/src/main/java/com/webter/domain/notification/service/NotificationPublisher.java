package com.webter.domain.notification.service;

import com.webter.domain.notification.entity.Notification;
import com.webter.domain.notification.entity.NotificationType;
import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 리뷰·댓글·답글 쪽에서 알림을 만든다. 호출한 쪽의 트랜잭션 안에서 저장하므로 본문 저장이 실패하면 알림도 남지 않는다.
 * 자기 행동은 알리지 않는다. 익명·비회원이 쓴 글은 알림에 작성자를 담지 않는다.
 */
@Component
@RequiredArgsConstructor
public class NotificationPublisher {

	private final EntityManager em;

	private final ServiceMemberRepository members;

	/** 내 서비스(등록자·팀원)에 리뷰가 달림. author는 비회원이면 null이다. */
	public void reviewCreated(WebService service, Long reviewId, User author, boolean anonymous) {
		User actor = anonymous ? null : author;
		for (User maker : makers(service)) {
			if (!same(maker, author)) {
				em.persist(Notification.reviewCreated(maker, actor, service.getId(), reviewId));
			}
		}
	}

	/** 내 서비스(등록자·팀원)에 댓글이 달림. */
	public void commentCreated(WebService service, Long commentId, User author, boolean anonymous) {
		User actor = anonymous ? null : author;
		for (User maker : makers(service)) {
			if (!same(maker, author)) {
				em.persist(Notification.commentCreated(maker, actor, service.getId(), commentId));
			}
		}
	}

	/** 내 댓글에 답글이 달림. 부모 댓글 작성자가 탈퇴했거나 본인이면 알리지 않는다. */
	public void commentReply(WebService service, Long replyId, User parentAuthor, User author, boolean anonymous) {
		if (parentAuthor == null || same(parentAuthor, author)) {
			return;
		}
		em.persist(Notification.commentReply(parentAuthor, anonymous ? null : author, service.getId(), replyId));
	}

	/** 내 리뷰에 제작자 답글이 달림. 리뷰 작성자가 비회원·탈퇴한 회원이면 알리지 않는다. */
	public void reviewReply(WebService service, Long reviewId, User reviewAuthor, User replier) {
		if (reviewAuthor == null || same(reviewAuthor, replier)) {
			return;
		}
		em.persist(Notification.reviewReply(reviewAuthor, replier, service.getId(), reviewId, null));
	}

	/** 서비스가 임시 비공개되거나 해제·최종 비공개될 때 등록자와 팀원에게 알린다. */
	public void serviceModerated(NotificationType type, long serviceId, String reason) {
		WebService service = em.find(WebService.class, serviceId);
		if (service == null) {
			return;
		}
		for (User maker : makers(service)) {
			em.persist(Notification.serviceModeration(type, maker, serviceId, reason));
		}
	}

	/** 리뷰·제작자 답글·댓글·프로필이 임시 비공개될 때 작성자에게 알린다. 작성자가 탈퇴했으면 알리지 않는다. */
	public void contentHidden(UUID authorId, String kind, Long serviceId, Long reviewId, Long commentId) {
		User author = authorId == null ? null : em.find(User.class, authorId);
		if (author != null) {
			em.persist(Notification.contentHidden(author, kind, serviceId, reviewId, commentId));
		}
	}

	/** 서비스 등록 제한을 알린다. */
	public void registrationRestricted(User member, String reason) {
		em.persist(Notification.registrationRestricted(member, reason));
	}

	private List<User> makers(WebService service) {
		List<User> result = new ArrayList<>();
		result.add(service.getOwner());
		for (ServiceMember member : members.findByWebService(service)) {
			result.add(member.getUser());
		}
		return result;
	}

	private static boolean same(User a, User b) {
		return a != null && b != null && a.getId().equals(b.getId());
	}

}

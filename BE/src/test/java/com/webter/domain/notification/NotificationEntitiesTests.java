package com.webter.domain.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.webter.DomainFixtureTest;
import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.comment.repository.ServiceCommentRepository;
import com.webter.domain.notification.entity.Notification;
import com.webter.domain.notification.entity.NotificationType;
import com.webter.domain.notification.repository.NotificationRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

// 알림 엔티티가 스키마와 맞는지, 안 읽은 알림 개수·읽음 처리·회원 삭제 시 동작을 확인한다
class NotificationEntitiesTests extends DomainFixtureTest {

	@Autowired
	NotificationRepository notificationRepository;

	@Autowired
	ServiceCommentRepository commentRepository;

	@Test
	void unreadCountDropsWhenRead() {
		User owner = createUser("owner");
		User replier = createUser("replier");
		WebService service = createService(owner, "https://example.com/notify");
		ServiceComment comment = commentRepository
			.save(ServiceComment.builder().webService(service).author(owner).content("댓글").build());
		Notification first = notificationRepository
			.save(Notification.commentReply(owner, replier, service.getId(), comment.getId()));
		Notification second = notificationRepository
			.save(Notification.commentReply(owner, replier, service.getId(), comment.getId()));
		flushAndClear();
		assertThat(notificationRepository.countByRecipientAndReadAtIsNull(owner)).isEqualTo(2);

		notificationRepository.findById(first.getId()).orElseThrow().markRead();
		flushAndClear();

		assertThat(notificationRepository.countByRecipientAndReadAtIsNull(owner)).isEqualTo(1);
		assertThat(notificationRepository.findByRecipientOrderByCreatedAtDescIdDesc(owner))
			.extracting(Notification::getId)
			.containsExactly(second.getId(), first.getId());
		Notification found = notificationRepository.findById(first.getId()).orElseThrow();
		assertThat(found.getType()).isEqualTo(NotificationType.COMMENT_REPLY);
		assertThat(found.getTargetCommentId()).isEqualTo(comment.getId());
		assertThat(found.getTargetReviewId()).isNull();
		assertThat(found.getReadAt()).isNotNull();
	}

	@Test
	void notificationOutlivesTheActorButNotTheRecipient() {
		User owner = createUser("owner");
		User actor = createUser("actor");
		WebService service = createService(owner, "https://example.com/notify-delete");
		Notification notification = notificationRepository
			.save(Notification.teamInvitation(owner, actor, service.getId(), null));
		flushAndClear();

		em.createNativeQuery("DELETE FROM users WHERE user_id = :id").setParameter("id", actor.getId())
			.executeUpdate();
		em.clear();
		assertThat(notificationRepository.findById(notification.getId()).orElseThrow().getActor()).isNull();

		em.createNativeQuery("DELETE FROM notifications WHERE recipient_id = :id")
			.setParameter("id", owner.getId())
			.executeUpdate();
		em.clear();
		assertThat(notificationRepository.findById(notification.getId())).isEmpty();
	}

}

package com.webter.domain.notification.repository;

import com.webter.domain.notification.entity.Notification;
import com.webter.domain.user.entity.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	List<Notification> findByRecipientOrderByCreatedAtDescIdDesc(User recipient);

	long countByRecipientAndReadAtIsNull(User recipient);

	long countByRecipient_IdAndReadAtIsNull(UUID recipientId);

	Optional<Notification> findByIdAndRecipient_Id(Long id, UUID recipientId);

	/** 최신순 한 페이지. (date, id)보다 오래된 알림부터 읽는다. */
	@Query("""
			select n from Notification n left join fetch n.actor
			where n.recipient.id = :recipientId and (:unreadOnly = false or n.readAt is null)
			  and (n.createdAt < :date or (n.createdAt = :date and n.id < :id))
			order by n.createdAt desc, n.id desc
			""")
	List<Notification> findPage(UUID recipientId, boolean unreadOnly, Instant date, long id, Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("update Notification n set n.readAt = :now where n.recipient.id = :recipientId and n.readAt is null")
	int markAllRead(UUID recipientId, Instant now);

	/** 대기 중인 초대 알림을 뺀 내 알림을 모두 지운다. 초대는 수락·거절 전에는 알림을 남긴다. */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			delete from notifications n where n.recipient_id = :recipientId
			  and not (n.notification_type = 'TEAM_INVITATION' and exists (
			    select 1 from service_invitations i
			    where i.invitation_id = n.target_invitation_id and i.status = 'PENDING'))
			""", nativeQuery = true)
	int deleteAllHandled(UUID recipientId);

	/** 초대가 취소되거나 팀원이 빠질 때 그 초대에 매달린 알림을 함께 지운다. */
	@Modifying(flushAutomatically = true)
	@Query("delete from Notification n where n.targetInvitationId = :invitationId")
	int deleteByInvitationId(Long invitationId);

	/** 초대를 수락·거절하면 받은 사람의 초대 알림은 읽음으로 바뀐다. */
	@Modifying(flushAutomatically = true)
	@Query("""
			update Notification n set n.readAt = :now
			where n.targetInvitationId = :invitationId and n.recipient.id = :recipientId and n.readAt is null
			""")
	int markInvitationRead(Long invitationId, UUID recipientId, Instant now);

}

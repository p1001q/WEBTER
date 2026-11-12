package com.webter.domain.team.service;

import com.webter.domain.notification.entity.Notification;
import com.webter.domain.notification.repository.NotificationRepository;
import com.webter.domain.reaction.service.ServiceInteractionAccess;
import com.webter.domain.team.dto.CandidateView;
import com.webter.domain.team.dto.InvitationResponse;
import com.webter.domain.team.dto.TeamView;
import com.webter.domain.team.dto.TeamView.InvitationView;
import com.webter.domain.team.dto.TeamView.MemberView;
import com.webter.domain.team.dto.TeamView.UserBrief;
import com.webter.domain.team.entity.InvitationStatus;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.entity.ServiceMemberId;
import com.webter.domain.team.exception.TeamErrorCode;
import com.webter.domain.team.repository.ServiceInvitationRepository;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 서비스별 팀원 초대·수락·제거(정책서 4.11). 등록자와 수락한 팀원이 같은 권한으로 팀을 관리한다.
 * 같은 서비스의 쓰기는 서비스 행을 잠가 직렬화하므로 팀원 5명 한도와 대기 초대 중복이 동시 요청에서도 지켜진다.
 */
@Service
@RequiredArgsConstructor
public class TeamService {

	/** 등록자를 제외한 팀원 최대 수. */
	public static final int MEMBER_LIMIT = 5;

	private static final int CANDIDATE_LIMIT = 10;

	private final ServiceInteractionAccess access;

	private final ServiceInvitationRepository invitations;

	private final ServiceMemberRepository members;

	private final NotificationRepository notifications;

	private final EntityManager em;

	@Transactional(readOnly = true)
	public TeamView team(long serviceId, UUID viewerId) {
		WebService service = find(serviceId);
		boolean maker = access.isMaker(service, viewerId);
		if (service.getVisibilityStatus() != VisibilityStatus.PUBLIC && !maker) {
			throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
		}
		List<MemberView> memberViews = members.findOrdered(service)
			.stream()
			.map(m -> new MemberView(brief(m.getUser()), m.getJoinedAt()))
			.toList();
		List<InvitationView> invitationViews = maker ? invitations.findWithInvitee(service, InvitationStatus.PENDING)
			.stream()
			.map(i -> new InvitationView(String.valueOf(i.getId()), brief(i.getInvitee()), i.getCreatedAt()))
			.toList() : List.of();
		return new TeamView(brief(service.getOwner()), memberViews, invitationViews, maker, MEMBER_LIMIT);
	}

	/** 초대할 회원 찾기. 공개 아이디가 입력값으로 시작하는 회원(공개 프로필, 정지 아님)을 보여 준다. */
	@Transactional(readOnly = true)
	public List<CandidateView> candidates(long serviceId, UUID viewerId, String query) {
		WebService service = requireMaker(find(serviceId), viewerId);
		String text = query == null ? "" : query.strip();
		if (text.length() < 2 || text.length() > 30) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		List<UUID> excluded = new ArrayList<>();
		excluded.add(service.getOwner().getId());
		members.findByWebService(service).forEach(m -> excluded.add(m.getUser().getId()));
		invitations.findWithInvitee(service, InvitationStatus.PENDING).forEach(i -> excluded.add(i.getInvitee().getId()));
		String pattern = text.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
		return em.createQuery("""
				select u from User u
				where lower(u.username) like :pattern escape '\\' and u.id not in :excluded
				  and u.accountStatus <> com.webter.domain.user.entity.AccountStatus.SUSPENDED
				  and u.visibilityStatus = com.webter.global.entity.VisibilityStatus.PUBLIC
				order by u.username
				""", User.class)
			.setParameter("pattern", pattern)
			.setParameter("excluded", excluded)
			.setMaxResults(CANDIDATE_LIMIT)
			.getResultList()
			.stream()
			.map(u -> new CandidateView(u.getId().toString(), u.getUsername(), u.getPublicNickname()))
			.toList();
	}

	@Transactional
	public InvitationResponse invite(long serviceId, UUID viewerId, String username) {
		WebService service = requireMaker(lock(serviceId), viewerId);
		User inviter = em.find(User.class, viewerId);
		User invitee = em
			.createQuery("select u from User u where lower(u.username) = lower(:username)", User.class)
			.setParameter("username", username.strip())
			.getResultStream()
			.findFirst()
			.filter(u -> u.getAccountStatus() != AccountStatus.SUSPENDED)
			.orElseThrow(() -> new BusinessException(TeamErrorCode.INVITEE_NOT_FOUND));
		if (invitee.getId().equals(viewerId)) {
			throw new BusinessException(TeamErrorCode.SELF_INVITE);
		}
		if (isMaker(service, invitee.getId())) {
			throw new BusinessException(TeamErrorCode.ALREADY_MAKER);
		}
		if (invitations.existsByWebServiceAndInviteeAndStatus(service, invitee, InvitationStatus.PENDING)) {
			throw new BusinessException(TeamErrorCode.INVITATION_PENDING);
		}
		if (members.countByWebService(service) >= MEMBER_LIMIT) {
			throw new BusinessException(TeamErrorCode.TEAM_FULL);
		}
		ServiceInvitation invitation = invitations
			.saveAndFlush(ServiceInvitation.builder().webService(service).inviter(inviter).invitee(invitee).build());
		em.persist(Notification.teamInvitation(invitee, inviter, service.getId(), invitation.getId()));
		return response(invitation);
	}

	/** 대기 중인 초대를 취소한다. 초대와 받은 사람의 알림을 함께 지운다. */
	@Transactional
	public void cancelInvitation(long serviceId, long invitationId, UUID viewerId) {
		WebService service = requireMaker(lock(serviceId), viewerId);
		ServiceInvitation invitation = invitations.findByIdAndWebService_Id(invitationId, service.getId())
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		if (invitation.getStatus() != InvitationStatus.PENDING) {
			throw new BusinessException(TeamErrorCode.INVITATION_HANDLED);
		}
		notifications.deleteByInvitationId(invitation.getId());
		invitations.delete(invitation);
	}

	@Transactional
	public InvitationResponse accept(long invitationId, UUID viewerId) {
		ServiceInvitation invitation = ownInvitation(invitationId, viewerId);
		WebService service = lock(invitation.getWebService().getId());
		refresh(invitation);
		pendingOrThrow(invitation);
		if (isMaker(service, viewerId)) {
			throw new BusinessException(TeamErrorCode.ALREADY_MAKER);
		}
		if (members.countByWebService(service) >= MEMBER_LIMIT) {
			throw new BusinessException(TeamErrorCode.TEAM_FULL);
		}
		invitation.accept();
		invitations.flush();
		members.save(ServiceMember.builder().webService(service).user(invitation.getInvitee()).invitation(invitation).build());
		finish(invitation, true);
		return response(invitation);
	}

	@Transactional
	public InvitationResponse decline(long invitationId, UUID viewerId) {
		ServiceInvitation invitation = ownInvitation(invitationId, viewerId);
		lock(invitation.getWebService().getId());
		refresh(invitation);
		pendingOrThrow(invitation);
		invitation.decline();
		invitations.flush();
		finish(invitation, false);
		return response(invitation);
	}

	/**
	 * 팀원을 뺀다. 팀원 본인이 나가는 것도 같은 요청이다. 등록자를 빼면 가장 먼저 수락한 팀원이 등록자 자리를 잇는다.
	 * 빠진 회원은 서비스 관리 권한을 잃고, 그 회원과 맺은 초대·알림은 지운다(다시 초대할 수 있다).
	 */
	@Transactional
	public void removeMember(long serviceId, UUID targetUserId, UUID viewerId) {
		WebService service = requireMaker(lock(serviceId), viewerId);
		if (service.getOwner().getId().equals(targetUserId)) {
			List<ServiceMember> ordered = members.findOrdered(service);
			if (ordered.isEmpty()) {
				throw new BusinessException(TeamErrorCode.LAST_MAKER);
			}
			ServiceMember successor = ordered.getFirst();
			removeInvitationOf(successor.getInvitation().getId());
			em.flush();
			service.changeOwner(successor.getUser());
			return;
		}
		ServiceMember member = members.findById(new ServiceMemberId(service.getId(), targetUserId))
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		removeInvitationOf(member.getInvitation().getId());
	}

	private void removeInvitationOf(Long invitationId) {
		notifications.deleteByInvitationId(invitationId);
		// 초대를 지우면 DB가 그 초대로 수락한 팀원 행도 함께 지운다
		em.createNativeQuery("delete from service_invitations where invitation_id = :id")
			.setParameter("id", invitationId)
			.executeUpdate();
	}

	// 수락·거절을 마치면 받은 사람의 초대 알림을 읽음으로 두고(지우지 않는다) 초대한 사람에게 결과를 알린다
	private void finish(ServiceInvitation invitation, boolean accepted) {
		notifications.markInvitationRead(invitation.getId(), invitation.getInvitee().getId(), Instant.now());
		User inviter = invitation.getInviter();
		if (inviter != null) {
			em.persist(Notification.teamInvitationResult(inviter, invitation.getInvitee(),
					invitation.getWebService().getId(), invitation.getId(), accepted));
		}
	}

	private ServiceInvitation ownInvitation(long invitationId, UUID viewerId) {
		ServiceInvitation invitation = invitations.findById(invitationId)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
		if (!invitation.getInvitee().getId().equals(viewerId)) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		if (invitation.getInvitee().getAccountStatus() == AccountStatus.SUSPENDED) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		return invitation;
	}

	// 서비스 잠금을 기다리는 사이 다른 요청이 초대를 바꿨거나 지웠을 수 있으므로 잠금 뒤에 최신 상태를 다시 읽는다
	private void refresh(ServiceInvitation invitation) {
		try {
			em.refresh(invitation);
		}
		catch (EntityNotFoundException e) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
	}

	private static void pendingOrThrow(ServiceInvitation invitation) {
		if (invitation.getStatus() != InvitationStatus.PENDING) {
			throw new BusinessException(TeamErrorCode.INVITATION_HANDLED);
		}
	}

	private WebService find(long serviceId) {
		WebService service = em.find(WebService.class, serviceId);
		if (service == null) {
			throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
		}
		return service;
	}

	private WebService lock(long serviceId) {
		WebService service = em.find(WebService.class, serviceId, LockModeType.PESSIMISTIC_WRITE);
		if (service == null) {
			throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
		}
		return service;
	}

	// 등록자와 수락한 팀원만 팀을 관리한다. 비공개 서비스는 그 밖의 사람에게 존재를 알리지 않는다.
	private WebService requireMaker(WebService service, UUID viewerId) {
		if (viewerId == null) {
			throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
		}
		User viewer = em.find(User.class, viewerId);
		if (viewer == null || viewer.getAccountStatus() == AccountStatus.SUSPENDED) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		if (access.isMaker(service, viewerId)) {
			return service;
		}
		if (service.getVisibilityStatus() != VisibilityStatus.PUBLIC) {
			throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
		}
		throw new BusinessException(CommonErrorCode.FORBIDDEN);
	}

	private boolean isMaker(WebService service, UUID userId) {
		return access.isMaker(service, userId);
	}

	private static UserBrief brief(User user) {
		return new UserBrief(user.getId().toString(), user.getUsername(), user.getPublicNickname());
	}

	private static InvitationResponse response(ServiceInvitation invitation) {
		return new InvitationResponse(String.valueOf(invitation.getId()),
				String.valueOf(invitation.getWebService().getId()), invitation.getStatus());
	}

}

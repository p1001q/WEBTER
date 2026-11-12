package com.webter.domain.team;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.DomainFixtureTest;
import com.webter.domain.team.entity.InvitationStatus;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.repository.ServiceInvitationRepository;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

// 팀 초대·팀원 엔티티가 스키마와 맞는지, 수락된 초대만 팀원이 될 수 있다는 제약(V3)이 동작하는지 확인한다.
// DB 오류가 나면 같은 트랜잭션이 중단되므로 제약 위반 확인은 테스트마다 마지막에 한 번만 한다.
class TeamEntitiesTests extends DomainFixtureTest {

	@Autowired
	ServiceInvitationRepository invitationRepository;

	@Autowired
	ServiceMemberRepository memberRepository;

	@Test
	void acceptedInvitationBecomesAMember() {
		User owner = createUser("owner");
		User invitee = createUser("invitee");
		WebService service = createService(owner, "https://example.com/team");
		ServiceInvitation invitation = invitationRepository.save(invitation(service, owner, invitee));
		flushAndClear();
		assertThat(invitationRepository.existsByWebServiceAndInviteeAndStatus(service, invitee,
				InvitationStatus.PENDING)).isTrue();

		ServiceInvitation pending = invitationRepository.findById(invitation.getId()).orElseThrow();
		pending.accept();
		em.flush(); // 팀원 행은 수락된 초대만 가리킬 수 있으므로 수락 상태를 먼저 DB에 반영한다
		memberRepository.save(ServiceMember.builder().webService(service).user(invitee).invitation(pending).build());
		flushAndClear();

		assertThat(memberRepository.findByWebService(service)).singleElement().satisfies(member -> {
			assertThat(member.getUser().getId()).isEqualTo(invitee.getId());
			assertThat(member.getInvitation().getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
			assertThat(member.getInvitation().getAcceptedAt()).isNotNull();
			assertThat(member.getJoinedAt()).isNotNull();
		});
		assertThat(memberRepository.findByUserOrderByJoinedAtDesc(invitee)).hasSize(1);
		assertThat(invitationRepository.findByInviteeAndStatusOrderByCreatedAtDesc(invitee,
				InvitationStatus.PENDING)).isEmpty();
	}

	@Test
	void memberCannotPointToAPendingInvitation() {
		User owner = createUser("owner");
		User invitee = createUser("invitee");
		WebService service = createService(owner, "https://example.com/pending-member");
		ServiceInvitation invitation = invitationRepository.saveAndFlush(invitation(service, owner, invitee));

		assertThatThrownBy(() -> memberRepository.saveAndFlush(
				ServiceMember.builder().webService(service).user(invitee).invitation(invitation).build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void cannotInviteYourself() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/self-invite");

		assertThatThrownBy(() -> invitationRepository.saveAndFlush(invitation(service, owner, owner)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void onlyOnePendingInvitationPerPersonAndService() {
		User owner = createUser("owner");
		User invitee = createUser("invitee");
		WebService service = createService(owner, "https://example.com/double-invite");
		invitationRepository.saveAndFlush(invitation(service, owner, invitee));

		assertThatThrownBy(() -> invitationRepository.saveAndFlush(invitation(service, owner, invitee)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private ServiceInvitation invitation(WebService service, User inviter, User invitee) {
		return ServiceInvitation.builder().webService(service).inviter(inviter).invitee(invitee).build();
	}

}

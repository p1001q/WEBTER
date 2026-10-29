package com.webter.domain.team.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 서비스 등록자가 다른 회원을 팀원으로 초대한 기록. 같은 서비스에 같은 회원의 대기 중 초대는 하나만 둘 수 있다. */
@Getter
@Entity
@Table(name = "service_invitations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceInvitation extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "invitation_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private WebService webService;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "inviter_id", nullable = false)
	private User inviter;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "invitee_id", nullable = false)
	private User invitee;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InvitationStatus status = InvitationStatus.PENDING;

	@Column(name = "accepted_at")
	private Instant acceptedAt;

	@Builder
	private ServiceInvitation(WebService webService, User inviter, User invitee) {
		this.webService = webService;
		this.inviter = inviter;
		this.invitee = invitee;
	}

	/** 초대를 수락 상태로 바꾼다. 팀원(ServiceMember)은 이 변경을 flush한 뒤에 저장해야 한다. */
	public void accept() {
		this.status = InvitationStatus.ACCEPTED;
		this.acceptedAt = Instant.now();
	}

}

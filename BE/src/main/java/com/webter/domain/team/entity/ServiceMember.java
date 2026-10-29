package com.webter.domain.team.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 초대를 수락해 서비스의 팀원이 된 회원. 팀원 연결은 서비스 관리 권한을 주지 않는다.
 * DB가 수락된(ACCEPTED) 초대만 가리키게 강제하므로, 초대를 수락 상태로 바꾸고 flush한 뒤에 저장해야 한다.
 */
@Getter
@Entity
@Table(name = "service_members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceMember {

	@EmbeddedId
	private ServiceMemberId id = new ServiceMemberId();

	@MapsId("serviceId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id")
	private WebService webService;

	@MapsId("userId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	// DB에서는 (invitation_id, service_id, user_id, 수락 상태) 복합 FK로 같은 서비스·수신자의 수락된 초대인지까지 확인한다
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "invitation_id", nullable = false)
	private ServiceInvitation invitation;

	@Column(name = "joined_at", nullable = false)
	private Instant joinedAt = Instant.now();

	@Builder
	private ServiceMember(WebService webService, User user, ServiceInvitation invitation) {
		this.webService = webService;
		this.user = user;
		this.invitation = invitation;
	}

}

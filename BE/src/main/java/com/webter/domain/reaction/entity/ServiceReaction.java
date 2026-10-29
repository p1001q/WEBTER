package com.webter.domain.reaction.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.BaseCreatedEntity;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원의 서비스 좋아요·저장. 한 회원이 한 서비스에 종류별로 하나씩 가진다(PK가 회원·서비스·종류).
 * 취소는 행을 삭제하는 것으로 처리한다.
 */
@Getter
@Entity
@Table(name = "service_reactions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceReaction extends BaseCreatedEntity {

	@EmbeddedId
	private ServiceReactionId id;

	@MapsId("userId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	@MapsId("serviceId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id")
	private WebService webService;

	public ServiceReaction(User user, WebService webService, ReactionType reactionType) {
		this.id = new ServiceReactionId(null, null, reactionType);
		this.user = user;
		this.webService = webService;
	}

	public ReactionType getReactionType() {
		return id.getReactionType();
	}

}

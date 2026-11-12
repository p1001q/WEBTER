package com.webter.domain.reaction.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** ServiceReaction의 복합 PK. 회원·서비스 값은 연관 관계(@MapsId)에서 채워지고, 반응 종류는 직접 넣는다. */
@Getter
@Embeddable
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceReactionId implements Serializable {

	@Column(name = "user_id")
	private UUID userId;

	@Column(name = "service_id")
	private Long serviceId;

	@Enumerated(EnumType.STRING)
	@Column(name = "reaction_type", length = 10)
	private ReactionType reactionType;

}

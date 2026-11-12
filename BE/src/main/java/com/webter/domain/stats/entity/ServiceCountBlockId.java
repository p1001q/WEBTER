package com.webter.domain.stats.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** ServiceCountBlock의 복합 PK. 서비스 값은 연관 관계(@MapsId)에서 채워지고, 행동 주체 값은 직접 넣는다. */
@Getter
@Embeddable
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceCountBlockId implements Serializable {

	@Column(name = "service_id")
	private Long serviceId;

	@Column(name = "actor_key")
	private String actorKey;

}

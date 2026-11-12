package com.webter.domain.team.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** ServiceMember의 복합 PK. 저장할 때는 연관 관계(@MapsId)에서 채워지고, 조회할 때만 직접 만든다. */
@Getter
@Embeddable
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceMemberId implements Serializable {

	@Column(name = "service_id")
	private Long serviceId;

	@Column(name = "user_id")
	private UUID userId;

}

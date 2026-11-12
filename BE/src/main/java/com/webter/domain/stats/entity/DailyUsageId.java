package com.webter.domain.stats.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyUsageId implements Serializable {

	@Column(name = "actor_key")
	private String actorKey;

	@Column(name = "usage_date")
	private LocalDate usageDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "usage_type", length = 30)
	private UsageType usageType;

}

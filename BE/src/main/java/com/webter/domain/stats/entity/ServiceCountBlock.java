package com.webter.domain.stats.entity;

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
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 반복 클릭 등으로 어떤 주체의 특정 서비스 클릭을 일정 기간 집계에서 제외하는 기록 */
@Getter
@Entity
@Table(name = "service_count_blocks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceCountBlock {

	@EmbeddedId
	private ServiceCountBlockId id;

	@MapsId("serviceId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id")
	private WebService webService;

	@Column(name = "blocked_at", nullable = false)
	private Instant blockedAt;

	@Column(name = "blocked_until", nullable = false)
	private Instant blockedUntil;

	@Column(nullable = false)
	private String reason;

	public ServiceCountBlock(WebService webService, String actorKey, Instant blockedUntil, String reason) {
		this.id = new ServiceCountBlockId(null, actorKey);
		this.webService = webService;
		this.blockedAt = Instant.now();
		this.blockedUntil = blockedUntil;
		this.reason = reason;
	}

	public String getActorKey() {
		return id.getActorKey();
	}

}

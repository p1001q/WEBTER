package com.webter.domain.stats.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
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
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서비스 조회·실행 기록. 모든 발생을 남기고, 집계에 넣을지는 counted로 구분한다.
 * 집계에서 뺀 기록은 excludedReason에 이유를 적는다(짝이 어긋나지 않도록 counted, excluded 생성 메서드로만 만든다).
 */
@Getter
@Entity
@Table(name = "service_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceEvent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "service_event_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private WebService webService;

	// 비회원이면 비어 있다
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private User user;

	// 서버가 판정한 행동 주체 값(회원 또는 비회원 식별 값)
	@Column(name = "actor_key", nullable = false)
	private String actorKey;

	@Column(name = "ip_key")
	private String ipKey;

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, length = 10)
	private EventType eventType;

	@Column(name = "is_counted", nullable = false)
	private boolean counted;

	@Column(name = "excluded_reason", length = 30)
	private String excludedReason;

	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt = Instant.now();

	private ServiceEvent(WebService webService, User user, String actorKey, String ipKey, EventType eventType,
			boolean counted, String excludedReason) {
		this.webService = webService;
		this.user = user;
		this.actorKey = actorKey;
		this.ipKey = ipKey;
		this.eventType = eventType;
		this.counted = counted;
		this.excludedReason = excludedReason;
	}

	public static ServiceEvent counted(WebService webService, User user, String actorKey, String ipKey,
			EventType eventType) {
		return new ServiceEvent(webService, user, actorKey, ipKey, eventType, true, null);
	}

	public static ServiceEvent excluded(WebService webService, User user, String actorKey, String ipKey,
			EventType eventType, String excludedReason) {
		return new ServiceEvent(webService, user, actorKey, ipKey, eventType, false, excludedReason);
	}

}

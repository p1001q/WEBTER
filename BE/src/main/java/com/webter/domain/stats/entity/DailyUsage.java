package com.webter.domain.stats.entity;

import com.webter.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 주체(회원 또는 비회원)별 하루 사용 횟수. 서비스 등록은 반드시 회원이어야 한다.
 * 동시에 여러 요청이 올 수 있으므로 한도 검사와 증가는 서비스 계층에서 한 트랜잭션으로 처리한다.
 */
@Getter
@Entity
@Table(name = "daily_usage")
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyUsage {

	@EmbeddedId
	private DailyUsageId id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private User user;

	@Column(name = "used_count", nullable = false)
	private int usedCount = 0;

	@LastModifiedDate
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	public DailyUsage(String actorKey, LocalDate usageDate, UsageType usageType, User user) {
		this.id = new DailyUsageId(actorKey, usageDate, usageType);
		this.user = user;
	}

	public void increase() {
		this.usedCount++;
	}

}

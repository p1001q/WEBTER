package com.webter.domain.user.entity;

import com.webter.domain.policy.entity.PolicyDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** 회원이 가입할 때 동의한 약관·확인 문구와 동의 시각 */
@Getter
@Entity
@Table(name = "user_consents")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserConsent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "user_consent_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "policy_document_id", nullable = false)
	private PolicyDocument policyDocument;

	@Column(name = "agreed_at", nullable = false)
	private Instant agreedAt = Instant.now();

	@Builder
	private UserConsent(User user, PolicyDocument policyDocument) {
		this.user = user;
		this.policyDocument = policyDocument;
	}

}

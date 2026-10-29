package com.webter.domain.user.entity;

import com.webter.global.entity.BaseCreatedEntity;
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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 회원과 소셜 계정(구글 sub)의 연결. 같은 계정이 두 회원에 연결되지 않도록 (provider, provider_subject)는 유일하다. */
@Getter
@Entity
@Table(name = "oauth_identities")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OAuthIdentity extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "oauth_identity_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OAuthProvider provider = OAuthProvider.GOOGLE;

	@Column(name = "provider_subject", nullable = false)
	private String providerSubject;

	@Builder
	private OAuthIdentity(User user, OAuthProvider provider, String providerSubject) {
		this.user = user;
		if (provider != null) {
			this.provider = provider;
		}
		this.providerSubject = providerSubject;
	}

}

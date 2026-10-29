package com.webter.domain.user.entity;

import com.webter.global.entity.BaseTimeEntity;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 회원. 가입 완료(온보딩 최종 제출) 때 만들어지므로 아이디와 닉네임이 항상 있다. */
@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "user_id")
	private UUID id;

	@Column(nullable = false, length = 30)
	private String username;

	@Column(nullable = false, length = 20)
	private String nickname;

	private String email;

	@Column(name = "avatar_url")
	private String avatarUrl;

	private String bio;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserRole role = UserRole.USER;

	@Enumerated(EnumType.STRING)
	@Column(name = "account_status", nullable = false, length = 30)
	private AccountStatus accountStatus = AccountStatus.ACTIVE;

	@Column(name = "restriction_reason")
	private String restrictionReason;

	@Enumerated(EnumType.STRING)
	@Column(name = "visibility_status", nullable = false, length = 20)
	private VisibilityStatus visibilityStatus = VisibilityStatus.PUBLIC;

	@Column(name = "hidden_reason")
	private String hiddenReason;

	@Column(name = "onboarding_completed_at", nullable = false)
	private Instant onboardingCompletedAt = Instant.now();

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "profile_links", nullable = false)
	private Map<String, String> profileLinks = new HashMap<>();

	@Builder
	private User(String username, String nickname, String email, String avatarUrl, String bio,
			Map<String, String> profileLinks) {
		this.username = username;
		this.nickname = nickname;
		this.email = email;
		this.avatarUrl = avatarUrl;
		this.bio = bio;
		if (profileLinks != null) {
			this.profileLinks = new HashMap<>(profileLinks);
		}
	}

}

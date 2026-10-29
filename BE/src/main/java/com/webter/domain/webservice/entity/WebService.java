package com.webter.domain.webservice.entity;

import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.user.entity.User;
import com.webter.global.entity.BaseTimeEntity;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 등록된 웹 서비스. 클래스 이름이 Spring의 @Service와 겹치지 않도록 WebService로 두고 테이블은 services다.
 * 등록하면 바로 공개되며, 사용 가능 여부(availabilityStatus)와 공개 여부(visibilityStatus)는 별개다.
 */
@Getter
@Entity
@Table(name = "services")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebService extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "service_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_id", nullable = false)
	private User owner;

	@Column(nullable = false, length = 30)
	private String name;

	@Column(nullable = false, length = 60)
	private String tagline;

	@Column(name = "description_markdown")
	private String descriptionMarkdown;

	@Column(name = "service_url", nullable = false)
	private String serviceUrl;

	// 중복 등록 판정용 정규화 주소. 같은 값으로 두 번 등록할 수 없다.
	@Column(name = "canonical_url", nullable = false)
	private String canonicalUrl;

	@Column(name = "github_url")
	private String githubUrl;

	@Enumerated(EnumType.STRING)
	@Column(name = "project_type", nullable = false, length = 20)
	private ProjectType projectType;

	@Enumerated(EnumType.STRING)
	@Column(name = "price_type", nullable = false, length = 20)
	private PriceType priceType;

	@Enumerated(EnumType.STRING)
	@Column(name = "registrant_type", nullable = false, length = 20)
	private RegistrantType registrantType;

	// 팀으로 등록할 때만 있고, 개인 등록이면 비어 있어야 한다
	@Column(name = "team_name")
	private String teamName;

	@Enumerated(EnumType.STRING)
	@Column(name = "availability_status", nullable = false, length = 20)
	private AvailabilityStatus availabilityStatus = AvailabilityStatus.AVAILABLE;

	@Column(name = "unavailable_reason", length = 60)
	private String unavailableReason;

	@Enumerated(EnumType.STRING)
	@Column(name = "visibility_status", nullable = false, length = 20)
	private VisibilityStatus visibilityStatus = VisibilityStatus.PUBLIC;

	@Column(name = "hidden_reason")
	private String hiddenReason;

	@Column(name = "icon_url")
	private String iconUrl;

	@Column(name = "thumbnail_url")
	private String thumbnailUrl;

	@Convert(converter = PreviewRatioConverter.class)
	@Column(name = "preview_ratio", nullable = false, length = 10)
	private PreviewRatio previewRatio = PreviewRatio.LANDSCAPE;

	@Enumerated(EnumType.STRING)
	@Column(name = "preview_fit", nullable = false, length = 10)
	private PreviewFit previewFit = PreviewFit.COVER;

	@Column(name = "allow_guest_reviews", nullable = false)
	private boolean allowGuestReviews = false;

	@Column(name = "allow_anonymous_reviews", nullable = false)
	private boolean allowAnonymousReviews = false;

	@Column(name = "allow_anonymous_comments", nullable = false)
	private boolean allowAnonymousComments = false;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "registration_policy_id", nullable = false)
	private PolicyDocument registrationPolicy;

	@Column(name = "registration_agreed_at", nullable = false)
	private Instant registrationAgreedAt = Instant.now();

	@Column(name = "url_checked_at")
	private Instant urlCheckedAt;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "device_codes", nullable = false)
	private List<DeviceCode> deviceCodes = new ArrayList<>();

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "language_codes", nullable = false)
	private List<LanguageCode> languageCodes = new ArrayList<>(List.of(LanguageCode.KO));

	// 미리보기 이미지 주소 목록(최대 8장)
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "preview_images", nullable = false)
	private List<String> previewImages = new ArrayList<>();

	@Builder
	private WebService(User owner, String name, String tagline, String descriptionMarkdown, String serviceUrl,
			String canonicalUrl, String githubUrl, ProjectType projectType, PriceType priceType,
			RegistrantType registrantType, String teamName, String iconUrl, String thumbnailUrl,
			PreviewRatio previewRatio, PreviewFit previewFit, boolean allowGuestReviews,
			boolean allowAnonymousReviews, boolean allowAnonymousComments, PolicyDocument registrationPolicy,
			List<DeviceCode> deviceCodes, List<LanguageCode> languageCodes, List<String> previewImages) {
		this.owner = owner;
		this.name = name;
		this.tagline = tagline;
		this.descriptionMarkdown = descriptionMarkdown;
		this.serviceUrl = serviceUrl;
		this.canonicalUrl = canonicalUrl;
		this.githubUrl = githubUrl;
		this.projectType = projectType;
		this.priceType = priceType;
		this.registrantType = registrantType;
		this.teamName = teamName;
		this.iconUrl = iconUrl;
		this.thumbnailUrl = thumbnailUrl;
		if (previewRatio != null) {
			this.previewRatio = previewRatio;
		}
		if (previewFit != null) {
			this.previewFit = previewFit;
		}
		this.allowGuestReviews = allowGuestReviews;
		this.allowAnonymousReviews = allowAnonymousReviews;
		this.allowAnonymousComments = allowAnonymousComments;
		this.registrationPolicy = registrationPolicy;
		if (deviceCodes != null) {
			this.deviceCodes = new ArrayList<>(deviceCodes);
		}
		if (languageCodes != null) {
			this.languageCodes = new ArrayList<>(languageCodes);
		}
		if (previewImages != null) {
			this.previewImages = new ArrayList<>(previewImages);
		}
	}

}

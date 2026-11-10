package com.webter.domain.webservice.service;

import com.webter.domain.category.entity.Category;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.domain.team.entity.ServiceMemberId;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.User;
import com.webter.domain.upload.service.ImageVerifier;
import com.webter.domain.user.repository.UserRepository;
import com.webter.domain.webservice.dto.AvailabilityRequest;
import com.webter.domain.webservice.dto.ServiceRequest;
import com.webter.domain.webservice.dto.UrlCheckRequest;
import com.webter.domain.webservice.dto.UrlCheckResponse;
import com.webter.domain.webservice.dto.VersionRequest;
import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PreviewFit;
import com.webter.domain.webservice.entity.PreviewRatio;
import com.webter.domain.webservice.entity.RegistrantType;
import com.webter.domain.webservice.entity.WebService;
import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.domain.webservice.repository.ServiceWriteRepository;
import com.webter.domain.webservice.repository.ServiceWriteRepository.VersionRow;
import com.webter.domain.webservice.repository.WebServiceRepository;
import com.webter.domain.webservice.service.ServiceQueryService.Viewer;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 서비스 등록·수정·삭제, 운영 상태와 버전 기록 관리. 관리 권한은 등록자, 수락한 팀원, 관리자에게 있다
 * (팀원은 등록자와 같은 권한을 가진다, 정책서 4.11).
 */
@Service
@RequiredArgsConstructor
public class ServiceCommandService {

	/** 한 계정이 하루에 등록할 수 있는 서비스 수(정책서 4.7) */
	static final int DAILY_REGISTRATION_LIMIT = 5;

	private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

	private final WebServiceRepository services;

	private final ServiceWriteRepository writes;

	private final CategoryRepository categories;

	private final UserRepository users;

	private final PolicyDocumentRepository policies;

	private final UrlProbe probe;

	private final ImageVerifier images;

	private final TransactionTemplate tx;

	private final ServiceMemberRepository members;

	/**
	 * 서비스를 등록한다. 이미지는 저장소에서 확인해야 하므로(외부 호출) 트랜잭션 밖에서 먼저 확인한 뒤 저장한다.
	 */
	public long create(UUID userId, ServiceRequest request) {
		Fields f = Fields.of(request);
		verifyImages(f, Set.of());
		Long id = tx.execute(status -> doCreate(userId, request, f));
		return id;
	}

	private long doCreate(UUID userId, ServiceRequest request, Fields f) {
		User user = users.findById(userId).orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
		if (user.getAccountStatus() != AccountStatus.ACTIVE) {
			throw new BusinessException(ServiceErrorCode.REGISTRATION_RESTRICTED);
		}
		if (!request.agreed()) {
			throw new BusinessException(ServiceErrorCode.REGISTRATION_AGREEMENT_REQUIRED);
		}
		ensureCategoriesExist(f.categories());
		if (services.existsByCanonicalUrl(f.canonicalUrl())) {
			throw new BusinessException(ServiceErrorCode.URL_DUPLICATED);
		}
		// 한도 검사와 증가를 한 번에 한다. 이후 저장이 실패하면 횟수도 함께 되돌아간다
		if (!writes.tryConsumeRegistration(userId.toString(), userId, LocalDate.now(ZONE), DAILY_REGISTRATION_LIMIT)) {
			throw new BusinessException(ServiceErrorCode.DAILY_LIMIT_EXCEEDED);
		}
		WebService saved = services.saveAndFlush(WebService.builder()
			.owner(user)
			.name(f.name())
			.tagline(f.tagline())
			.descriptionMarkdown(f.description())
			.serviceUrl(f.url())
			.canonicalUrl(f.canonicalUrl())
			.githubUrl(f.githubUrl())
			.projectType(request.projectType())
			.priceType(request.priceType())
			.registrantType(f.registrantType())
			.teamName(f.teamName())
			.iconUrl(f.iconUrl())
			.thumbnailUrl(f.thumbnailUrl())
			.previewRatio(f.previewRatio())
			.previewFit(f.previewFit())
			.allowGuestReviews(request.guestReviews())
			.allowAnonymousReviews(request.anonymousReviews())
			.allowAnonymousComments(request.anonymousComments())
			.registrationPolicy(policies.findFirstByDocumentTypeOrderByIdDesc(DocumentType.SERVICE_REGISTRATION)
				.orElseThrow(() -> new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR)))
			.deviceCodes(request.devices())
			.languageCodes(f.languages())
			.previewImages(f.previewImages())
			.build());
		writes.replaceCategories(saved.getId(), f.categories());
		writes.replaceTags(saved.getId(), f.tags());
		return saved.getId();
	}

	/** 서비스를 수정한다. 새로 연결하는 이미지만 저장소에서 확인한다(트랜잭션 밖). */
	public void update(long id, Viewer viewer, ServiceRequest request) {
		Fields f = Fields.of(request);
		verifyImages(f, currentImages(id, viewer));
		tx.executeWithoutResult(status -> doUpdate(id, viewer, request, f));
	}

	private void doUpdate(long id, Viewer viewer, ServiceRequest request, Fields f) {
		WebService service = manageable(id, viewer);
		ensureCategoriesExist(f.categories());
		if (!service.getCanonicalUrl().equals(f.canonicalUrl()) && services.existsByCanonicalUrl(f.canonicalUrl())) {
			throw new BusinessException(ServiceErrorCode.URL_DUPLICATED);
		}
		service.update(f.name(), f.tagline(), f.description(), f.url(), f.canonicalUrl(), f.githubUrl(),
				request.projectType(), request.priceType(), f.registrantType(), f.teamName(), f.iconUrl(),
				f.thumbnailUrl(), f.previewRatio(), f.previewFit(), request.guestReviews(),
				request.anonymousReviews(), request.anonymousComments(), request.devices(), f.languages(),
				f.previewImages());
		services.flush();
		writes.replaceCategories(id, f.categories());
		writes.replaceTags(id, f.tags());
	}

	@Transactional
	public void delete(long id, Viewer viewer) {
		WebService service = manageable(id, viewer);
		// 리뷰·댓글·버전 기록·좋아요·저장은 DB의 삭제 연쇄로 함께 지워진다(정책서 4.6)
		services.delete(service);
		services.flush();
	}

	@Transactional
	public void changeAvailability(long id, Viewer viewer, AvailabilityRequest request) {
		WebService service = manageable(id, viewer);
		String reason = request.reason() == null ? null : request.reason().trim();
		if (request.status() == AvailabilityStatus.UNAVAILABLE && (reason == null || reason.isEmpty())) {
			throw new BusinessException(ServiceErrorCode.STOP_REASON_REQUIRED);
		}
		service.changeAvailability(request.status(), reason);
	}

	/** 버전 기록을 보낸 목록으로 맞춘다. 다른 서비스의 기록 id를 보내면 거절한다. */
	@Transactional
	public void replaceVersions(long id, Viewer viewer, List<VersionRequest> requests) {
		manageable(id, viewer);
		Set<Long> existing = Set.copyOf(writes.versionIds(id));
		List<VersionRow> rows = new ArrayList<>();
		for (VersionRequest r : requests) {
			if (r == null || r.version() == null || r.title() == null || r.content() == null
					|| r.version().isBlank() || r.title().isBlank() || r.content().isBlank()) {
				throw new BusinessException(ServiceErrorCode.INVALID_VERSION);
			}
			Long versionId = parseId(r.id());
			if (versionId != null && !existing.contains(versionId)) {
				throw new BusinessException(ServiceErrorCode.INVALID_VERSION);
			}
			rows.add(new VersionRow(versionId, r.version().trim(), r.title().trim(), r.content().trim()));
		}
		writes.replaceVersions(id, rows);
	}

	// 이미 서비스에 연결된 이미지(수정 때 다시 확인하지 않는다). 관리 권한이 없으면 서비스가 없는 것처럼 404로 답한다.
	private Set<String> currentImages(long id, Viewer viewer) {
		return java.util.Objects.requireNonNull(tx.execute(status -> {
			WebService service = manageable(id, viewer);
			Set<String> urls = new java.util.HashSet<>(service.getPreviewImages());
			if (service.getIconUrl() != null) {
				urls.add(service.getIconUrl());
			}
			if (service.getThumbnailUrl() != null) {
				urls.add(service.getThumbnailUrl());
			}
			return urls;
		}));
	}

	// 새로 연결하는 이미지는 이 서버가 올린 이미지이고 저장소에 실제로 있는 이미지여야 한다
	private void verifyImages(Fields f, Set<String> alreadyLinked) {
		List<String> urls = new ArrayList<>();
		if (f.iconUrl() != null) {
			urls.add(f.iconUrl());
		}
		if (f.thumbnailUrl() != null) {
			urls.add(f.thumbnailUrl());
		}
		urls.addAll(f.previewImages());
		for (String url : urls) {
			if (alreadyLinked.contains(url)) {
				continue;
			}
			if (!images.isOwnUrl(url)) {
				throw new BusinessException(ServiceErrorCode.INVALID_IMAGE_URL);
			}
			images.verify(url);
		}
	}

	/**
	 * 주소 형식, 중복, 접속 가능 여부를 차례로 검사한다. 검사 결과는 오류가 아니라 응답의 state로 알린다.
	 * 외부 접속을 기다리는 동안 DB 연결을 잡고 있지 않도록 트랜잭션을 걸지 않는다. 중복 조회는 트랜잭션 없이 한 번의
	 * 조회로 처리되고(선언한 조회 메서드에는 기본 트랜잭션이 없다) open-in-view가 꺼져 있어 연결은 곧바로 반환된다.
	 */
	public UrlCheckResponse checkUrl(UrlCheckRequest request) {
		String url;
		try {
			url = ServiceUrlPolicy.validateServiceUrl(request.url());
		}
		catch (BusinessException ex) {
			return new UrlCheckResponse(UrlCheckResponse.State.FORMAT, ex.getErrorCode().getMessage());
		}
		String canonical = ServiceUrlPolicy.canonical(url);
		boolean taken = services.findByCanonicalUrl(canonical)
			.map(s -> request.selfId() == null || !s.getId().equals(request.selfId()))
			.orElse(false);
		if (taken) {
			return new UrlCheckResponse(UrlCheckResponse.State.DUPLICATE, ServiceErrorCode.URL_DUPLICATED.getMessage());
		}
		if (!probe.isReachable(url)) {
			return new UrlCheckResponse(UrlCheckResponse.State.UNREACHABLE,
					"접속할 수 없어요. 배포 상태를 확인한 뒤 다시 검사하세요.");
		}
		return new UrlCheckResponse(UrlCheckResponse.State.OK, "접속을 확인했어요.");
	}

	// 관리 권한(등록자·관리자)이 없으면 서비스가 있는지 여부를 알리지 않고 404로 답한다
	private WebService manageable(long id, Viewer viewer) {
		WebService service = services.findById(id)
			.orElseThrow(() -> new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND));
		if (viewer.admin() || service.getOwner().getId().equals(viewer.userId())
				|| members.existsById(new ServiceMemberId(service.getId(), viewer.userId()))) {
			return service;
		}
		throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
	}

	private void ensureCategoriesExist(List<String> codes) {
		Set<String> found = categories.findByCodeInAndActiveTrue(codes)
			.stream()
			.map(Category::getCode)
			.collect(Collectors.toSet());
		if (!found.containsAll(codes)) {
			throw new BusinessException(ServiceErrorCode.INVALID_CATEGORY);
		}
	}

	private static Long parseId(String id) {
		if (id == null || id.isBlank()) {
			return null;
		}
		try {
			return Long.valueOf(id.trim());
		}
		catch (NumberFormatException ex) {
			throw new BusinessException(ServiceErrorCode.INVALID_VERSION);
		}
	}

	/** 요청 값을 정리·검증한 결과. */
	private record Fields(String name, String tagline, String description, String url, String canonicalUrl,
			String githubUrl, List<String> categories, List<String> tags, List<LanguageCode> languages,
			RegistrantType registrantType, String teamName, String iconUrl, String thumbnailUrl,
			PreviewRatio previewRatio, PreviewFit previewFit, List<String> previewImages) {

		static Fields of(ServiceRequest r) {
			String url = ServiceUrlPolicy.validateServiceUrl(r.url());
			String team = r.teamName() == null || r.teamName().isBlank() ? null : r.teamName().trim();
			List<String> categoryCodes = r.categories().stream().map(String::trim).toList();
			if (Set.copyOf(categoryCodes).size() != categoryCodes.size()) {
				throw new BusinessException(ServiceErrorCode.INVALID_CATEGORY);
			}
			// 빈 주소가 섞여 있으면 거절한다(미리보기는 보낸 이미지만 순서대로 둔다)
			List<String> previews = r.previewImages() == null ? List.of() : r.previewImages().stream().map(u -> {
				String checked = ServiceUrlPolicy.validateImageUrl(u);
				if (checked == null) {
					throw new BusinessException(ServiceErrorCode.INVALID_IMAGE_URL);
				}
				return checked;
			}).toList();
			List<LanguageCode> languages = r.languages() == null || r.languages().isEmpty()
					? List.of(LanguageCode.KO) : r.languages().stream().distinct().toList();
			String description = r.description() == null || r.description().isBlank() ? null : r.description().trim();
			return new Fields(r.name().trim(), r.tagline().trim(), description, url,
					ServiceUrlPolicy.canonical(url), ServiceUrlPolicy.validateGithubUrl(r.githubUrl()), categoryCodes,
					tags(r.tags()), languages, team == null ? RegistrantType.INDIVIDUAL : RegistrantType.TEAM, team,
					ServiceUrlPolicy.validateImageUrl(r.iconUrl()), ServiceUrlPolicy.validateImageUrl(r.thumbnailUrl()),
					r.previewRatio() == null ? PreviewRatio.LANDSCAPE : r.previewRatio(),
					r.previewFit() == null ? PreviewFit.COVER : r.previewFit(), previews);
		}

		// 앞의 #을 떼고 공백을 정리하며, 대소문자만 다른 태그는 하나로 본다
		private static List<String> tags(List<String> raw) {
			if (raw == null) {
				return List.of();
			}
			Map<String, String> unique = new LinkedHashMap<>();
			for (String tag : raw) {
				String name = tag == null ? "" : tag.trim().replaceFirst("^#+", "").trim();
				if (name.isEmpty()) {
					continue;
				}
				if (name.length() > 30) {
					throw new BusinessException(ServiceErrorCode.INVALID_TAG);
				}
				unique.putIfAbsent(name.toLowerCase(), name);
			}
			if (unique.size() > 5) {
				throw new BusinessException(ServiceErrorCode.INVALID_TAG);
			}
			return List.copyOf(unique.values());
		}

	}

}

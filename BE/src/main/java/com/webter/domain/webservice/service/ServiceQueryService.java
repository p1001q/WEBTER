package com.webter.domain.webservice.service;

import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.dto.ServicePageResponse;
import com.webter.domain.webservice.dto.ServiceResponse;
import com.webter.domain.webservice.dto.ServiceSearchCondition;
import com.webter.domain.webservice.dto.ServiceSort;
import com.webter.domain.webservice.entity.ServiceVersion;
import com.webter.domain.webservice.entity.WebService;
import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.domain.webservice.repository.ServiceQueryRepository;
import com.webter.domain.webservice.repository.ServiceQueryRepository.Counts;
import com.webter.domain.webservice.repository.ServiceVersionRepository;
import com.webter.domain.webservice.repository.WebServiceRepository;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import java.time.Instant;
import java.util.List;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 서비스 목록·상세 조회. 비공개 서비스는 제작자 본인과 관리자만 상세로 볼 수 있다. */
@Service
@RequiredArgsConstructor
public class ServiceQueryService {

	private final WebServiceRepository services;

	private final ServiceVersionRepository versions;

	private final ServiceQueryRepository queries;

	private final ServiceMemberRepository members;

	/** 조회하는 사람. 비로그인이면 null이다. */
	public record Viewer(UUID userId, boolean admin) {
	}

	@Transactional(readOnly = true)
	public ServicePageResponse list(ServiceSearchCondition condition) {
		if (condition.sort() == ServiceSort.RELEVANCE && condition.query().isEmpty()) {
			throw new BusinessException(ServiceErrorCode.INVALID_SORT);
		}
		Instant now = Instant.now();
		var page = queries.findPublicIds(condition, now);
		return new ServicePageResponse(assemble(page.ids(), now, null), condition.page(), condition.size(),
				page.total());
	}

	@Transactional(readOnly = true)
	public ServiceResponse detail(long id, Viewer viewer) {
		WebService service = services.findAllWithOwnerByIdIn(List.of(id))
			.stream()
			.findFirst()
			.orElseThrow(() -> new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND));
		// 공개되지 않은 서비스는 있는지 여부도 알리지 않는다
		if (service.getVisibilityStatus() != VisibilityStatus.PUBLIC
				&& !canSeePrivate(service, viewer, memberServiceIds(viewer))) {
			throw new BusinessException(ServiceErrorCode.SERVICE_NOT_FOUND);
		}
		return assemble(List.of(id), Instant.now(), viewer).getFirst();
	}

	/** 내가 등록했거나 팀원으로 참여한 서비스 전체. 비공개·운영 중지도 포함하고 최신순이다. */
	@Transactional(readOnly = true)
	public List<ServiceResponse> mine(Viewer viewer) {
		return assemble(queries.findOwnedIds(viewer.userId()), Instant.now(), viewer);
	}

	// 비공개 정보를 볼 수 있는 사람: 관리자, 등록자, 수락한 팀원
	private static boolean canSeePrivate(WebService service, Viewer viewer, Set<Long> memberOf) {
		return viewer != null && (viewer.admin() || service.getOwner().getId().equals(viewer.userId())
				|| memberOf.contains(service.getId()));
	}

	private Set<Long> memberServiceIds(Viewer viewer) {
		return viewer == null ? Set.of() : new HashSet<>(members.findServiceIdsByUserId(viewer.userId()));
	}

	// 정렬된 id 순서를 유지해 응답으로 만든다
	private List<ServiceResponse> assemble(List<Long> ids, Instant now, Viewer viewer) {
		if (ids.isEmpty()) {
			return List.of();
		}
		Map<Long, WebService> byId = services.findAllWithOwnerByIdIn(ids)
			.stream()
			.collect(Collectors.toMap(WebService::getId, s -> s));
		Map<Long, Counts> counts = queries.counts(ids, now);
		Map<Long, List<String>> categories = queries.categoryCodes(ids);
		Map<Long, List<String>> tags = queries.tagNames(ids);
		Map<Long, List<ServiceVersion>> versionsById = versions.findByWebServiceIdInOrderByCreatedAtDesc(ids)
			.stream()
			.collect(Collectors.groupingBy(v -> v.getWebService().getId()));
		Set<Long> memberOf = memberServiceIds(viewer);
		Map<Long, List<ServiceMember>> membersById = members.findOrderedByServiceIds(ids)
			.stream()
			.collect(Collectors.groupingBy(m -> m.getWebService().getId()));
		return ids.stream()
			.map(byId::get)
			.map(s -> toResponse(s, counts.getOrDefault(s.getId(), Counts.EMPTY), categories.getOrDefault(s.getId(), List.of()),
					tags.getOrDefault(s.getId(), List.of()), versionsById.getOrDefault(s.getId(), List.of()),
					membersById.getOrDefault(s.getId(), List.of()), canSeePrivate(s, viewer, memberOf)))
			.toList();
	}

	private static ServiceResponse toResponse(WebService s, Counts c, List<String> categories, List<String> tags,
			List<ServiceVersion> versions, List<ServiceMember> teamMembers, boolean privileged) {
		User owner = s.getOwner();
		return new ServiceResponse(String.valueOf(s.getId()), s.getName(), s.getTagline(), s.getDescriptionMarkdown(),
				s.getServiceUrl(), s.getGithubUrl(),
				new ServiceResponse.Owner(owner.getId().toString(), owner.getUsername(), owner.getNickname()),
				teamMembers.stream()
					.map(m -> new ServiceResponse.Owner(m.getUser().getId().toString(), m.getUser().getUsername(),
							m.getUser().getNickname()))
					.toList(),
				s.getCreatedAt(), categories, tags, s.getProjectType(), s.getDeviceCodes(), s.getPriceType(),
				s.getRegistrantType(), s.getTeamName(), s.getLanguageCodes(), s.getAvailabilityStatus(),
				s.getUnavailableReason(), s.getVisibilityStatus(),
				privileged ? s.getHiddenReason() : null, s.getIconUrl(), s.getThumbnailUrl(),
				s.getPreviewRatio(), s.getPreviewFit(), s.getPreviewImages(), s.isAllowGuestReviews(),
				s.isAllowAnonymousReviews(), s.isAllowAnonymousComments(), c.views(), c.clicks(), c.likes(), c.saves(),
				new ServiceResponse.ReviewCounts(c.up(), c.down(), c.none()),
				new ServiceResponse.Scores(c.score3(), c.scoreWeek(), c.scoreMonth()),
				versions.stream()
					.map(v -> new ServiceResponse.VersionEntry(String.valueOf(v.getId()), v.getVersion(), v.getTitle(),
							v.getContent(), v.getCreatedAt()))
					.toList());
	}

}

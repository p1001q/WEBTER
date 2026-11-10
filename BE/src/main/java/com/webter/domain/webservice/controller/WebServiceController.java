package com.webter.domain.webservice.controller;

import com.webter.domain.user.entity.UserRole;
import com.webter.domain.webservice.dto.ScorePeriod;
import com.webter.domain.webservice.dto.ServicePageResponse;
import com.webter.domain.webservice.dto.ServiceResponse;
import com.webter.domain.webservice.dto.ServiceSearchCondition;
import com.webter.domain.webservice.dto.ServiceSort;
import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import com.webter.domain.webservice.entity.RegistrantType;
import com.webter.domain.webservice.service.ServiceQueryService;
import com.webter.domain.webservice.service.ServiceQueryService.Viewer;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 서비스 목록·상세 조회. 로그인 없이 쓸 수 있다(공개 서비스만). */
@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class WebServiceController {

	private final ServiceQueryService queries;

	/**
	 * 공개 서비스 목록. 필터는 여러 값을 쉼표로 보내며(같은 항목 안은 OR, 항목 사이는 AND), 정렬은
	 * LATEST·TRENDING·POPULAR(period로 기간 선택)·RELEVANCE(검색어 필요)이다. page는 0부터 시작한다.
	 */
	@GetMapping
	public ApiResponse<ServicePageResponse> list(@RequestParam(required = false) String q,
			@RequestParam(required = false) List<String> category,
			@RequestParam(required = false) List<ProjectType> type,
			@RequestParam(required = false) List<DeviceCode> device,
			@RequestParam(required = false) List<PriceType> price,
			@RequestParam(required = false) List<RegistrantType> registrant,
			@RequestParam(required = false) List<LanguageCode> language,
			@RequestParam(required = false) List<AvailabilityStatus> availability,
			@RequestParam(required = false) ServiceSort sort, @RequestParam(required = false) ScorePeriod period,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "0") int size) {
		return ApiResponse.ok(queries.list(new ServiceSearchCondition(q, category, type, device, price, registrant,
				language, availability, sort, period, page, size)));
	}

	@GetMapping("/{id}")
	public ApiResponse<ServiceResponse> detail(@PathVariable long id, Authentication authentication) {
		return ApiResponse.ok(queries.detail(id, viewer(authentication)));
	}

	private static Viewer viewer(Authentication authentication) {
		if (authentication != null && authentication.getPrincipal() instanceof SessionPrincipal.Member member) {
			boolean admin = authentication.getAuthorities()
				.stream()
				.anyMatch(a -> a.getAuthority().equals("ROLE_" + UserRole.ADMIN.name()));
			return new Viewer(member.userId(), admin);
		}
		return null;
	}

}

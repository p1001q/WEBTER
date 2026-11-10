package com.webter.domain.webservice.dto;

import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import com.webter.domain.webservice.entity.RegistrantType;
import java.util.List;

/**
 * 목록 조회 조건. 같은 항목 안의 값은 OR, 항목 사이는 AND다(정책서 5.3). 비어 있는 항목은 조건으로 쓰지 않는다.
 * categories는 카테고리 코드, query는 이름·소개·태그에서 찾을 검색어다.
 */
public record ServiceSearchCondition(String query, List<String> categories, List<ProjectType> projectTypes,
		List<DeviceCode> devices, List<PriceType> prices, List<RegistrantType> registrants,
		List<LanguageCode> languages, List<AvailabilityStatus> availabilities, ServiceSort sort, ScorePeriod period,
		int page, int size) {

	public static final int DEFAULT_SIZE = 20;

	public static final int MAX_SIZE = 100;

	public ServiceSearchCondition {
		categories = categories == null ? List.of() : categories;
		projectTypes = projectTypes == null ? List.of() : projectTypes;
		devices = devices == null ? List.of() : devices;
		prices = prices == null ? List.of() : prices;
		registrants = registrants == null ? List.of() : registrants;
		languages = languages == null ? List.of() : languages;
		availabilities = availabilities == null ? List.of() : availabilities;
		query = query == null ? "" : query.trim();
		sort = sort == null ? (query.isEmpty() ? ServiceSort.LATEST : ServiceSort.RELEVANCE) : sort;
		period = period == null ? ScorePeriod.ALL : period;
		page = Math.max(page, 0);
		size = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
	}

}

package com.webter.domain.webservice.dto;

import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PreviewFit;
import com.webter.domain.webservice.entity.PreviewRatio;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 서비스 등록·수정 요청. 수정은 같은 항목을 모두 보내며(전체 교체) 운영 상태·공개 상태·버전 기록은 바뀌지 않는다.
 * teamName이 있으면 팀 등록, 없으면 개인 등록이다. agreeRegistration은 등록할 때만 확인한다.
 */
public record ServiceRequest(
		@NotBlank @Size(max = 30, message = "서비스 이름은 30자까지 입력할 수 있습니다.") String name,
		@NotBlank @Size(max = 60, message = "한 줄 소개는 60자까지 입력할 수 있습니다.") String tagline,
		@NotBlank String url, String githubUrl,
		@NotEmpty @Size(max = 3, message = "서비스 용도는 최대 3개까지 선택할 수 있습니다.") List<@NotBlank String> categories,
		@NotNull ProjectType projectType,
		@NotEmpty @Size(max = 2) List<@NotNull DeviceCode> devices, @NotNull PriceType priceType,
		@Size(max = 30, message = "팀명은 30자까지 입력할 수 있습니다.") String teamName,
		@Size(max = 5000, message = "상세 설명은 5000자까지 입력할 수 있습니다.") String description, List<String> tags,
		List<LanguageCode> languages, String iconUrl, String thumbnailUrl, PreviewRatio previewRatio,
		PreviewFit previewFit, @Size(max = 8, message = "미리보기 이미지는 최대 8장입니다.") List<String> previewImages,
		Boolean allowGuestReviews, Boolean allowAnonymousReviews, Boolean allowAnonymousComments,
		Boolean agreeRegistration) {

	// 보내지 않은 항목은 허용하지 않음(false)으로 본다
	public boolean guestReviews() {
		return Boolean.TRUE.equals(allowGuestReviews);
	}

	public boolean anonymousReviews() {
		return Boolean.TRUE.equals(allowAnonymousReviews);
	}

	public boolean anonymousComments() {
		return Boolean.TRUE.equals(allowAnonymousComments);
	}

	public boolean agreed() {
		return Boolean.TRUE.equals(agreeRegistration);
	}

}

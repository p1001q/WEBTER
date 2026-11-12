package com.webter.domain.webservice.dto;

import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PreviewFit;
import com.webter.domain.webservice.entity.PreviewRatio;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import com.webter.domain.webservice.entity.RegistrantType;
import com.webter.global.entity.VisibilityStatus;
import java.time.Instant;
import java.util.List;

/**
 * 서비스 목록·상세 응답. 집계(조회·실행·좋아요·저장·평가·점수)는 저장된 기록에서 계산한 값이다.
 * 열거형 값은 DB 코드값이며 화면 표시용 값으로의 변환은 프론트가 한다.
 */
public record ServiceResponse(String id, String name, String tagline, String description, String url,
		String githubUrl, Owner owner, List<Owner> members, Instant createdAt, List<String> categories, List<String> tags,
		ProjectType projectType, List<DeviceCode> devices, PriceType priceType, RegistrantType registrantType,
		String teamName, List<LanguageCode> languages, AvailabilityStatus availability, String unavailableReason,
		VisibilityStatus visibility, String hiddenReason, String iconUrl, String thumbnailUrl,
		PreviewRatio previewRatio, PreviewFit previewFit, List<String> previewImages, boolean allowGuestReviews,
		boolean allowAnonymousReviews, boolean allowAnonymousComments, long views, long clicks, long likes,
		long saves, ReviewCounts reviews, Scores scores, List<VersionEntry> versions) {

	/** 제작자(등록자와 수락한 팀원). 이메일 등 비공개 정보는 담지 않는다. members는 수락한 순서의 팀원이다. */
	public record Owner(String id, String username, String nickname) {
	}

	/** 평가 수. 추천·비추천·미설정(글만 있는 리뷰). */
	public record ReviewCounts(long up, long down, long none) {
	}

	/** 기간별 인기 점수(이용하기 ×1 + 좋아요 ×3 + 저장 ×5). 최근 3일·주간·월간 순이다. */
	public record Scores(long threeDays, long week, long month) {
	}

	public record VersionEntry(String id, String version, String title, String content, Instant createdAt) {
	}

}

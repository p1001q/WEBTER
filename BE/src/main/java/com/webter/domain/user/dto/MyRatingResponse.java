package com.webter.domain.user.dto;

/**
 * 내가 남긴 서비스 평가(추천·비추천). 목록 카드가 서비스마다 조회하지 않고 내 평가 상태를 한 번에 채우는 데 쓴다.
 * written은 본문이 있는 리뷰인지다(본문이 있으면 평가를 바꿀 때 리뷰 수정 확인을 거친다).
 */
public record MyRatingResponse(String serviceId, String rate, boolean written) {
}

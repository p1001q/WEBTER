package com.webter.domain.review.entity;

/** 서비스 평가 상태. 비회원과 등록자 본인의 리뷰는 NONE만 가능하다. */
public enum ReviewRating {
	RECOMMEND,
	NOT_RECOMMEND,
	NONE
}

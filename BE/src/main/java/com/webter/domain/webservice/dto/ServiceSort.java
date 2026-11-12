package com.webter.domain.webservice.dto;

/** 목록 정렬. TRENDING은 최근 3일 점수, POPULAR는 선택한 기간(period)의 점수, RELEVANCE는 검색어 일치도다. */
public enum ServiceSort {
	LATEST,
	TRENDING,
	POPULAR,
	RELEVANCE
}

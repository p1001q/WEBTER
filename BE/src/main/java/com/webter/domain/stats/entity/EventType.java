package com.webter.domain.stats.entity;

/** 서비스 조회(VIEW)와 `이용하기` 클릭(LAUNCH). 좋아요·저장은 반응 테이블에서 따로 집계한다. */
public enum EventType {
	VIEW,
	LAUNCH
}

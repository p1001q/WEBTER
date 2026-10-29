package com.webter.domain.stats.entity;

/** 하루 사용 횟수를 제한하는 기능. 서비스 등록은 회원만, AI 검색은 비회원도 쓴다. */
public enum UsageType {
	SERVICE_REGISTRATION,
	AI_SEARCH
}

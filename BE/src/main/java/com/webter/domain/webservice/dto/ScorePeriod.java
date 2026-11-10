package com.webter.domain.webservice.dto;

import java.time.Duration;
import java.time.Instant;

/** 인기 점수를 모으는 기간. 주간·월간은 각각 7일·30일로 본다(제안). */
public enum ScorePeriod {
	THREE_DAYS(Duration.ofDays(3)),
	WEEK(Duration.ofDays(7)),
	MONTH(Duration.ofDays(30)),
	ALL(null);

	private final Duration length;

	ScorePeriod(Duration length) {
		this.length = length;
	}

	/** 이 기간이 시작되는 시각. 전체 기간은 가장 이른 시각이다. */
	public Instant since(Instant now) {
		return length == null ? Instant.EPOCH : now.minus(length);
	}
}

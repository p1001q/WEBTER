package com.webter.domain.user.dto;

import java.time.Instant;

/** 내가 저장한 서비스. 저장한 시각 순서(먼저 저장한 것이 앞)로 내려 준다. */
public record SavedServiceResponse(String serviceId, Instant savedAt) {

}

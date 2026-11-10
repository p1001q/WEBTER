package com.webter.domain.webservice.dto;

import com.webter.domain.webservice.entity.AvailabilityStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 운영 상태 변경. 운영 중지(UNAVAILABLE)는 사유(60자 이하)가 필요하다. */
public record AvailabilityRequest(@NotNull AvailabilityStatus status,
		@Size(max = 60, message = "운영 중지 사유는 60자까지 입력할 수 있습니다.") String reason) {

}

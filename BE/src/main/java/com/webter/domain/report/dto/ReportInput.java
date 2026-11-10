package com.webter.domain.report.dto;

import com.webter.domain.report.entity.ReportReason;
import com.webter.domain.report.entity.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportInput(@NotNull ReportTargetType targetType, @NotBlank @Size(max = 36) String targetId,
		@NotNull ReportReason reason, @Size(max = 1000) String detail) {
}

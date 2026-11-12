package com.webter.domain.user.dto;

import com.webter.domain.policy.entity.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 사용자가 동의한 문서의 종류와, 화면에 보여 준 문서 버전 */
public record ConsentRequest(@NotNull DocumentType documentType, @NotBlank String version) {

}

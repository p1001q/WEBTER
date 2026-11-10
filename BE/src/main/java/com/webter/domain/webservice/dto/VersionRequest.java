package com.webter.domain.webservice.dto;

import jakarta.validation.constraints.NotBlank;

/** 버전 기록 한 건. id가 있으면 그 기록을 수정하고, 없으면 새로 추가한다(일자는 등록 일시가 자동으로 들어간다). */
public record VersionRequest(String id, @NotBlank String version, @NotBlank String title, @NotBlank String content) {

}

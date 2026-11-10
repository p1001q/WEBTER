package com.webter.domain.webservice.dto;

import jakarta.validation.constraints.NotBlank;

/** 서비스 주소 검사 요청. selfId는 수정 화면에서 자기 자신과의 중복을 제외할 때 보낸다. */
public record UrlCheckRequest(@NotBlank String url, Long selfId) {

}

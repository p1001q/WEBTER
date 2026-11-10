package com.webter.domain.webservice.dto;

import java.util.List;

/** 페이지 번호(offset) 방식의 목록 응답. page는 0부터 시작한다. */
public record ServicePageResponse(List<ServiceResponse> items, int page, int size, long total) {
}

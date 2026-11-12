package com.webter.domain.webservice.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 미리보기 이미지의 공통 비율. DB에는 "16:9", "9:16"으로 저장된다. */
@Getter
@RequiredArgsConstructor
public enum PreviewRatio {

	LANDSCAPE("16:9"),
	PORTRAIT("9:16");

	private final String value;

}

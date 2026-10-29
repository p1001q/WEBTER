package com.webter.domain.webservice.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;

@Converter
public class PreviewRatioConverter implements AttributeConverter<PreviewRatio, String> {

	@Override
	public String convertToDatabaseColumn(PreviewRatio attribute) {
		return attribute == null ? null : attribute.getValue();
	}

	@Override
	public PreviewRatio convertToEntityAttribute(String dbData) {
		if (dbData == null) {
			return null;
		}
		return Arrays.stream(PreviewRatio.values())
			.filter(ratio -> ratio.getValue().equals(dbData))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("알 수 없는 미리보기 비율: " + dbData));
	}

}

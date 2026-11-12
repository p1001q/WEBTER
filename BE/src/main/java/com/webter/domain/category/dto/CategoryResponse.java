package com.webter.domain.category.dto;

import com.webter.domain.category.entity.Category;

public record CategoryResponse(String code, String name, int sortOrder, String defaultIconUrl,
		String defaultThumbnailUrl) {

	public static CategoryResponse of(Category category) {
		return new CategoryResponse(category.getCode(), category.getName(), category.getSortOrder(),
				category.getDefaultIconUrl(), category.getDefaultThumbnailUrl());
	}

}

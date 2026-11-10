package com.webter.domain.category.controller;

import com.webter.domain.category.dto.CategoryResponse;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 서비스 용도 카테고리 목록. 로그인 없이 조회한다. */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

	private final CategoryRepository categories;

	@GetMapping
	@Transactional(readOnly = true)
	public ApiResponse<List<CategoryResponse>> list() {
		return ApiResponse.ok(categories.findByActiveTrueOrderBySortOrderAsc().stream().map(CategoryResponse::of).toList());
	}

}

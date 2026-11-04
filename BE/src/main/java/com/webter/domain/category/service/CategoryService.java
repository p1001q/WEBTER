package com.webter.domain.category.service;

import com.webter.domain.category.entity.Category;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.global.exception.BusinessException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {

	private final CategoryRepository categories;

	/** 코드 목록을 선택 순서대로 카테고리로 바꾼다. 중복·존재하지 않는 코드·비활성 카테고리는 거절한다. */
	@Transactional(readOnly = true)
	public List<Category> resolveActive(List<String> codes) {
		if (codes == null || codes.isEmpty()) {
			return List.of();
		}
		Set<String> unique = new HashSet<>(codes);
		if (unique.size() != codes.size()) {
			throw new BusinessException(UserErrorCode.INVALID_CATEGORY);
		}
		Map<String, Category> found = new HashMap<>();
		categories.findByCodeInAndActiveTrue(unique).forEach(category -> found.put(category.getCode(), category));
		return codes.stream().map(code -> {
			Category category = found.get(code);
			if (category == null) {
				throw new BusinessException(UserErrorCode.INVALID_CATEGORY);
			}
			return category;
		}).toList();
	}

}

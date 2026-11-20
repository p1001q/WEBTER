package com.webter.domain.user.controller;

import com.webter.domain.user.dto.UserSearchResponse;
import com.webter.domain.user.service.UserSearchService;
import com.webter.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/search")
@RequiredArgsConstructor
public class UserSearchController {

	private final UserSearchService search;

	@GetMapping
	public ApiResponse<UserSearchResponse> search(@RequestParam(defaultValue = "") String q,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return ApiResponse.ok(search.search(q, page, size));
	}

}

package com.webter.domain.policy.controller;

import com.webter.domain.policy.dto.CurrentPolicyResponse;
import com.webter.domain.policy.service.PolicyService;
import com.webter.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/policies")
@RequiredArgsConstructor
public class PolicyController {

	private final PolicyService policyService;

	@GetMapping("/current")
	public ApiResponse<List<CurrentPolicyResponse>> current() {
		return ApiResponse.ok(policyService.currentAll().stream().map(CurrentPolicyResponse::of).toList());
	}

}

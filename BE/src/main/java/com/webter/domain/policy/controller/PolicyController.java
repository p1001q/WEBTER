package com.webter.domain.policy.controller;

import com.webter.domain.policy.dto.CurrentPolicyResponse;
import com.webter.domain.policy.dto.PolicyContentResponse;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.service.PolicyService;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.response.ApiResponse;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

	/** 종류별 현재 문서의 원문. 종류는 대소문자를 구분하지 않는다(terms, privacy 등). */
	@GetMapping("/{documentType}")
	public ApiResponse<PolicyContentResponse> content(@PathVariable String documentType) {
		DocumentType type = parse(documentType);
		return ApiResponse.ok(policyService.current(type)
			.map(PolicyContentResponse::of)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND)));
	}

	private static DocumentType parse(String value) {
		try {
			return DocumentType.valueOf(value.toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
	}

}

package com.webter.domain.report.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.report.dto.ReportInput;
import com.webter.domain.report.service.ReportService;
import com.webter.domain.report.service.ReportService.Receipt;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

	private final ReportService reports;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<Receipt> submit(@AuthenticationPrincipal SessionPrincipal.Member member,
			@Valid @RequestBody ReportInput input) {
		return ApiResponse.ok(reports.submit(viewerId(member), input));
	}
}

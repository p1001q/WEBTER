package com.webter.domain.report.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;
import static com.webter.domain.report.repository.ReportTargetStore.ref;

import com.webter.domain.report.dto.ModerationInput.Resolve;
import com.webter.domain.report.dto.ModerationInput.SanctionMember;
import com.webter.domain.report.dto.ModerationView.Action;
import com.webter.domain.report.dto.ModerationView.Detail;
import com.webter.domain.report.dto.ModerationView.HiddenTarget;
import com.webter.domain.report.dto.ModerationView.Page;
import com.webter.domain.report.dto.ModerationView.Queue;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.report.service.AdminModerationService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminModerationController {

	private final AdminModerationService moderation;

	@GetMapping("/reports")
	public ApiResponse<Queue> queue(@AuthenticationPrincipal SessionPrincipal.Member admin,
			@RequestParam(defaultValue = "true") boolean pendingOnly, @RequestParam(defaultValue = "0") int page) {
		return ApiResponse.ok(moderation.queue(viewerId(admin), pendingOnly, page));
	}

	@GetMapping("/reports/{type}/{id}")
	public ApiResponse<Detail> detail(@AuthenticationPrincipal SessionPrincipal.Member admin,
			@PathVariable ReportTargetType type, @PathVariable String id, @RequestParam(defaultValue = "0") int page) {
		return ApiResponse.ok(moderation.detail(viewerId(admin), ref(type, id), page));
	}

	@PostMapping("/reports/{type}/{id}/actions")
	public ApiResponse<Action> resolve(@AuthenticationPrincipal SessionPrincipal.Member admin,
			@PathVariable ReportTargetType type, @PathVariable String id, @Valid @RequestBody Resolve input) {
		return ApiResponse.ok(moderation.resolve(viewerId(admin), ref(type, id), input));
	}

	@GetMapping("/temporarily-hidden")
	public ApiResponse<Page<HiddenTarget>> temporarilyHidden(@AuthenticationPrincipal SessionPrincipal.Member admin,
			@RequestParam(defaultValue = "0") int page) {
		return ApiResponse.ok(moderation.temporarilyHidden(viewerId(admin), page));
	}

	@PostMapping("/users/{id}/sanctions")
	public ApiResponse<Action> sanction(@AuthenticationPrincipal SessionPrincipal.Member admin, @PathVariable UUID id,
			@Valid @RequestBody SanctionMember input) {
		return ApiResponse.ok(moderation.sanction(viewerId(admin), id, input));
	}

	@GetMapping("/moderation-actions")
	public ApiResponse<Page<Action>> history(@AuthenticationPrincipal SessionPrincipal.Member admin,
			@RequestParam(defaultValue = "0") int page) {
		return ApiResponse.ok(moderation.history(viewerId(admin), page));
	}
}

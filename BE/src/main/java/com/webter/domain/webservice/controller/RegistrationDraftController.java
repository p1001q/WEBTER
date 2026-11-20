package com.webter.domain.webservice.controller;

import com.webter.domain.webservice.dto.RegistrationDraftPayload;
import com.webter.domain.webservice.service.RegistrationDraftService;
import com.webter.domain.webservice.service.RegistrationDraftService.Draft;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/registration-draft")
@RequiredArgsConstructor
public class RegistrationDraftController {

	private final RegistrationDraftService drafts;

	public record SaveRequest(UUID expectedRevision, @Valid @NotNull RegistrationDraftPayload payload) {
	}

	@GetMapping
	public ApiResponse<Draft> get(@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(drafts.get(member.userId()));
	}

	@PutMapping
	public ApiResponse<Draft> save(@AuthenticationPrincipal SessionPrincipal.Member member,
			@Valid @RequestBody SaveRequest request) {
		return ApiResponse.ok(drafts.save(member.userId(), request.expectedRevision(), request.payload()));
	}

	@DeleteMapping
	public ApiResponse<Void> discard(@AuthenticationPrincipal SessionPrincipal.Member member,
			@RequestParam UUID revision) {
		drafts.discard(member.userId(), revision);
		return ApiResponse.ok();
	}

}

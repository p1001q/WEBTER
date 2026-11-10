package com.webter.domain.reaction.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.reaction.entity.ReactionType;
import com.webter.domain.reaction.service.ServiceReactionService;
import com.webter.domain.reaction.service.ServiceReactionService.State;
import com.webter.domain.reaction.service.ServiceReactionService.Toggle;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services/{serviceId}/reactions")
@RequiredArgsConstructor
public class ServiceReactionController {

	private final ServiceReactionService reactions;

	@GetMapping
	public ApiResponse<State> state(@PathVariable long serviceId, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reactions.state(serviceId, viewerId(member)));
	}

	@PutMapping("/{type}")
	public ApiResponse<Toggle> add(@PathVariable long serviceId, @PathVariable ReactionType type,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reactions.set(serviceId, viewerId(member), type, true));
	}

	@DeleteMapping("/{type}")
	public ApiResponse<Toggle> remove(@PathVariable long serviceId, @PathVariable ReactionType type,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reactions.set(serviceId, viewerId(member), type, false));
	}

}

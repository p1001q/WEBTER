package com.webter.domain.stats.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.stats.entity.EventType;
import com.webter.domain.stats.service.ServiceEventService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services/{serviceId}/events")
@RequiredArgsConstructor
public class ServiceEventController {

	private final ServiceEventService events;

	@PostMapping("/{type}")
	public ApiResponse<Void> record(@PathVariable long serviceId, @PathVariable EventType type,
			@AuthenticationPrincipal SessionPrincipal.Member member, HttpServletRequest request) {
		events.record(serviceId, viewerId(member), type, request.getRemoteAddr());
		return ApiResponse.ok();
	}

}

package com.webter.domain.team.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.team.dto.CandidateView;
import com.webter.domain.team.dto.InvitationResponse;
import com.webter.domain.team.dto.InviteRequest;
import com.webter.domain.team.dto.TeamView;
import com.webter.domain.team.service.TeamService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 서비스 팀원 조회·초대·제거와 받은 초대의 수락·거절. */
@RestController
@RequiredArgsConstructor
public class TeamController {

	private final TeamService team;

	/** 팀 구성. 공개 서비스는 누구나 보고 대기 중인 초대는 등록자·팀원에게만 보인다. */
	@GetMapping("/api/services/{serviceId}/team")
	public ApiResponse<TeamView> team(@PathVariable long serviceId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(team.team(serviceId, viewerId(member)));
	}

	@GetMapping("/api/services/{serviceId}/team/candidates")
	public ApiResponse<List<CandidateView>> candidates(@PathVariable long serviceId, @RequestParam String q,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(team.candidates(serviceId, viewerId(member), q));
	}

	@PostMapping("/api/services/{serviceId}/team/invitations")
	public ResponseEntity<ApiResponse<InvitationResponse>> invite(@PathVariable long serviceId,
			@Valid @RequestBody InviteRequest body, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(ApiResponse.ok(team.invite(serviceId, viewerId(member), body.username())));
	}

	@DeleteMapping("/api/services/{serviceId}/team/invitations/{invitationId}")
	public ApiResponse<Void> cancel(@PathVariable long serviceId, @PathVariable long invitationId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		team.cancelInvitation(serviceId, invitationId, viewerId(member));
		return ApiResponse.ok();
	}

	@DeleteMapping("/api/services/{serviceId}/team/members/{userId}")
	public ApiResponse<Void> remove(@PathVariable long serviceId, @PathVariable UUID userId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		team.removeMember(serviceId, userId, viewerId(member));
		return ApiResponse.ok();
	}

	@PostMapping("/api/invitations/{invitationId}/accept")
	public ApiResponse<InvitationResponse> accept(@PathVariable long invitationId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(team.accept(invitationId, viewerId(member)));
	}

	@PostMapping("/api/invitations/{invitationId}/decline")
	public ApiResponse<InvitationResponse> decline(@PathVariable long invitationId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(team.decline(invitationId, viewerId(member)));
	}

}

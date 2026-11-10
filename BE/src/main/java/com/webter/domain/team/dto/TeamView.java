package com.webter.domain.team.dto;

import java.time.Instant;
import java.util.List;

/**
 * 서비스의 팀 구성. 등록자와 팀원은 누구나 보고, 대기 중인 초대는 등록자·팀원에게만 내려간다.
 * canManage는 내가 이 팀을 관리할 수 있는지(등록자 또는 수락한 팀원)다.
 */
public record TeamView(UserBrief owner, List<MemberView> members, List<InvitationView> invitations,
		boolean canManage, int memberLimit) {

	public record UserBrief(String id, String username, String nickname) {
	}

	public record MemberView(UserBrief user, Instant joinedAt) {
	}

	public record InvitationView(String id, UserBrief invitee, Instant createdAt) {
	}

}

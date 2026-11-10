package com.webter.domain.team.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum TeamErrorCode implements ErrorCode {

	SELF_INVITE(HttpStatus.BAD_REQUEST, "TEAM_400_01", "자기 자신은 초대할 수 없습니다."),
	INVITEE_NOT_FOUND(HttpStatus.NOT_FOUND, "TEAM_404_01", "초대할 회원을 찾을 수 없습니다."),
	ALREADY_MAKER(HttpStatus.CONFLICT, "TEAM_409_01", "이미 이 서비스의 등록자 또는 팀원입니다."),
	INVITATION_PENDING(HttpStatus.CONFLICT, "TEAM_409_02", "이미 초대한 회원입니다. 수락을 기다리고 있습니다."),
	TEAM_FULL(HttpStatus.CONFLICT, "TEAM_409_03", "팀원은 등록자를 제외하고 최대 5명입니다."),
	INVITATION_HANDLED(HttpStatus.CONFLICT, "TEAM_409_04", "이미 처리된 초대입니다."),
	LAST_MAKER(HttpStatus.CONFLICT, "TEAM_409_05", "팀원이 없는 서비스의 등록자는 제거할 수 없습니다. 서비스를 삭제해 주세요.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

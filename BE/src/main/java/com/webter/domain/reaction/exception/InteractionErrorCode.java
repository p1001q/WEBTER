package com.webter.domain.reaction.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum InteractionErrorCode implements ErrorCode {

	LINK_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "INTERACTION_400_01", "글에 링크를 넣을 수 없습니다."),
	OWN_SERVICE(HttpStatus.FORBIDDEN, "INTERACTION_403_01", "내 서비스에는 이 반응을 남길 수 없습니다."),
	ANONYMOUS_NOT_ALLOWED(HttpStatus.FORBIDDEN, "INTERACTION_403_02", "익명으로 작성할 수 없습니다."),
	GUEST_REVIEW_NOT_ALLOWED(HttpStatus.FORBIDDEN, "INTERACTION_403_03", "비회원 리뷰를 허용하지 않는 서비스입니다."),
	RATING_UNAVAILABLE(HttpStatus.CONFLICT, "INTERACTION_409_01", "운영 중지 서비스에는 단독 평가를 남길 수 없습니다."),
	EDIT_REVIEW_REQUIRED(HttpStatus.CONFLICT, "INTERACTION_409_02", "작성한 리뷰에서 평가를 수정해 주세요."),
	REVIEW_ALREADY_EXISTS(HttpStatus.CONFLICT, "INTERACTION_409_03", "이미 작성한 리뷰가 있습니다."),
	COMMENT_CANNOT_BE_REPLIED_TO(HttpStatus.CONFLICT, "INTERACTION_409_04", "이 댓글에는 답글을 달 수 없습니다."),
	GUEST_REVIEW_ALREADY_EXISTS(HttpStatus.CONFLICT, "INTERACTION_409_05", "이 IP로 이미 리뷰를 남겼습니다."),
	EVENT_RECORDING_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "INTERACTION_503_01", "이용 기록을 저장할 수 없습니다."),
	GUEST_REVIEW_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "INTERACTION_503_02", "비회원 리뷰를 저장할 수 없습니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

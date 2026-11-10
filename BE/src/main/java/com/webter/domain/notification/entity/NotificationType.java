package com.webter.domain.notification.entity;

/**
 * 알림 종류. 정책서 6.5의 9종과 팀 초대 흐름이다.
 * REVIEW_CREATED~REVIEW_REPLY는 리뷰·댓글 쪽에서, TEAM_*는 팀 쪽에서, 나머지는 신고·운영 처리에서 만든다.
 */
public enum NotificationType {
	/** 내 서비스에 리뷰 */
	REVIEW_CREATED,
	/** 내 서비스에 댓글 */
	COMMENT_CREATED,
	/** 내 댓글에 답글 */
	COMMENT_REPLY,
	/** 내 리뷰에 제작자 답글 */
	REVIEW_REPLY,
	/** 팀원 초대를 받음 */
	TEAM_INVITATION,
	/** 내가 보낸 초대를 수락함 */
	TEAM_INVITATION_ACCEPTED,
	/** 내가 보낸 초대를 거절함 */
	TEAM_INVITATION_DECLINED,
	/** 서비스 임시 비공개 */
	SERVICE_HIDDEN,
	/** 서비스 임시 비공개 해제 */
	SERVICE_UNHIDDEN,
	/** 서비스 최종 비공개 조치 */
	SERVICE_BLOCKED,
	/** 내 리뷰·댓글·답글·프로필 임시 비공개 */
	CONTENT_HIDDEN,
	/** 서비스 등록 제한과 사유 안내 */
	REGISTRATION_RESTRICTED
}

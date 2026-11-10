package com.webter.domain.team.entity;

public enum InvitationStatus {
	PENDING,
	ACCEPTED,
	/** 받은 사람이 거절함. 기록과 알림은 지우지 않고 남긴다. */
	DECLINED
}

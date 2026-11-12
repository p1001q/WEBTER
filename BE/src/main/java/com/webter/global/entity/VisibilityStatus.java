package com.webter.global.entity;

/** 회원·서비스·리뷰·댓글의 공개 상태. 신고 누적이나 운영 조치로 TEMP_HIDDEN·HIDDEN이 된다. */
public enum VisibilityStatus {
	PUBLIC,
	TEMP_HIDDEN,
	HIDDEN
}

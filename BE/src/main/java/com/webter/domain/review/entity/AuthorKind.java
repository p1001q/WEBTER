package com.webter.domain.review.entity;

/** 리뷰 작성자 구분. 비회원(GUEST)은 등록자가 허용한 서비스에만 쓸 수 있다. */
public enum AuthorKind {
	MEMBER,
	GUEST
}

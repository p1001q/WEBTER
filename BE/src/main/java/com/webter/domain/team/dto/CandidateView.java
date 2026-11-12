package com.webter.domain.team.dto;

/** 초대할 회원을 고르는 검색 결과. 공개 아이디로 구별한다. */
public record CandidateView(String id, String username, String nickname) {
}

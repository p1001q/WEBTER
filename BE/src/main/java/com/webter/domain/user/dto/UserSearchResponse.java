package com.webter.domain.user.dto;

import java.util.List;
import java.util.UUID;

/** 회원 검색의 공개 요약. 이메일·권한·외부 링크 등 검색에 필요 없는 정보는 포함하지 않는다. */
public record UserSearchResponse(List<Item> items, int page, int size, long total) {

	public record Item(UUID id, String username, String nickname, String avatarUrl, String bio) {
	}

}

package com.webter.domain.user.dto;

import com.webter.domain.user.entity.User;
import java.util.List;
import java.util.UUID;

/** 제작자 프로필(공개 정보). 이메일 등 비공개 항목은 담지 않는다. 집계는 공개된 서비스 기준이다. */
public record UserProfileResponse(UUID id, String username, String nickname, String bio, List<LinkResponse> links,
		long serviceCount, long receivedLikes) {

	// 외부 링크는 종류 이름순으로 내려 응답이 항상 같은 순서가 되게 한다(MemberResponse와 같은 규칙)
	public static UserProfileResponse of(User user, long serviceCount, long receivedLikes) {
		List<LinkResponse> links = user.getProfileLinks()
			.entrySet()
			.stream()
			.sorted(java.util.Map.Entry.comparingByKey())
			.map(entry -> new LinkResponse(entry.getKey(), entry.getValue()))
			.toList();
		return new UserProfileResponse(user.getId(), user.getUsername(), user.getNickname(),
				user.getBio() == null ? "" : user.getBio(), links, serviceCount, receivedLikes);
	}

}

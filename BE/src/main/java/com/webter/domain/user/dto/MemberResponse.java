package com.webter.domain.user.dto;

import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserRole;
import java.util.List;
import java.util.UUID;

public record MemberResponse(UUID id, String username, String nickname, String email, String bio,
		List<LinkResponse> links, UserRole role, AccountStatus accountStatus, List<String> interests) {

	// 외부 링크는 종류 이름순으로 내려 응답이 항상 같은 순서가 되게 한다
	public static MemberResponse of(User user, List<String> interestCodes) {
		List<LinkResponse> links = user.getProfileLinks()
			.entrySet()
			.stream()
			.sorted(java.util.Map.Entry.comparingByKey())
			.map(entry -> new LinkResponse(entry.getKey(), entry.getValue()))
			.toList();
		return new MemberResponse(user.getId(), user.getUsername(), user.getNickname(), user.getEmail(),
				user.getBio() == null ? "" : user.getBio(), links, user.getRole(), user.getAccountStatus(),
				interestCodes);
	}

}

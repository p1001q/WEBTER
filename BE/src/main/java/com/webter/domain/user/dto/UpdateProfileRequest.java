package com.webter.domain.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 계정 설정 저장. interests·links는 보낸 목록으로 바뀐다. avatarUrl은 생략하거나 null이면 유지하고 빈 문자열이면 삭제한다. */
public record UpdateProfileRequest(
		@NotBlank @Pattern(regexp = UserPatterns.USERNAME, message = "아이디 형식이 올바르지 않습니다.") String username,
		@NotBlank @ValidNickname String nickname,
		@Size(max = 80, message = "한 줄 소개는 80자까지 입력할 수 있습니다.") String bio,
		@Size(max = 5, message = "외부 링크는 최대 5개까지 입력할 수 있습니다.") List<@Valid @NotNull LinkRequest> links,
		@Size(max = 3, message = "관심 카테고리는 최대 3개까지 선택할 수 있습니다.") List<@NotBlank String> interests,
		String avatarUrl) {

}

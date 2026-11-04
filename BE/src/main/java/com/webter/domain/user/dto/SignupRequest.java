package com.webter.domain.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 온보딩 최종 제출. interests는 카테고리 코드이며 비워도(건너뛰기) 된다. */
public record SignupRequest(
		@NotBlank @Pattern(regexp = UserPatterns.USERNAME, message = "아이디 형식이 올바르지 않습니다.") String username,
		@NotBlank @ValidNickname String nickname,
		@Size(max = 3, message = "관심 카테고리는 최대 3개까지 선택할 수 있습니다.") List<@NotBlank String> interests,
		@NotNull List<@Valid @NotNull ConsentRequest> consents) {

}

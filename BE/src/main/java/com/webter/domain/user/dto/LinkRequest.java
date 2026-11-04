package com.webter.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 프로필 외부 링크 한 개. 같은 종류는 하나만 둘 수 있다. */
public record LinkRequest(
		@NotBlank @Pattern(regexp = "github|instagram|velog|blog|portfolio", message = "지원하지 않는 링크 종류입니다.") String kind,
		@NotBlank @Size(max = 300, message = "링크 주소는 300자까지 입력할 수 있습니다.") String url) {

}

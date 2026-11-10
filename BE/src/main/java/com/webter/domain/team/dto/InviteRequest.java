package com.webter.domain.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 팀원 초대. 초대할 회원의 공개 아이디(대소문자 구분 없음)를 보낸다. */
public record InviteRequest(@NotBlank @Size(max = 30) String username) {
}

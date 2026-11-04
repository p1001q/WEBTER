package com.webter.domain.user.controller;

import com.webter.domain.user.dto.MemberResponse;
import com.webter.domain.user.dto.UpdateProfileRequest;
import com.webter.domain.user.service.AccountService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인한 회원 본인의 계정 설정. 가입을 완료한 회원만 호출할 수 있다(SecurityConfig). */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

	private final AccountService accountService;

	@PutMapping
	public ApiResponse<MemberResponse> update(Authentication authentication, @Valid @RequestBody UpdateProfileRequest body) {
		return ApiResponse.ok(accountService.updateProfile(memberId(authentication), body));
	}

	/** 탈퇴하면 이 세션도 즉시 끊는다. */
	@DeleteMapping
	public ApiResponse<Void> withdraw(Authentication authentication, HttpServletRequest request,
			HttpServletResponse response) {
		accountService.withdraw(memberId(authentication));
		new SecurityContextLogoutHandler().logout(request, response, authentication);
		return ApiResponse.ok();
	}

	private static java.util.UUID memberId(Authentication authentication) {
		return ((SessionPrincipal.Member) authentication.getPrincipal()).userId();
	}

}

package com.webter.domain.user.controller;

import com.webter.domain.user.dto.MemberResponse;
import com.webter.domain.user.dto.SessionResponse;
import com.webter.domain.user.dto.SignupRequest;
import com.webter.domain.user.dto.UserPatterns;
import com.webter.domain.user.dto.UsernameAvailabilityResponse;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.service.MemberService;
import com.webter.domain.user.service.SignupService;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.AuthProperties;
import com.webter.global.security.ReturnPath;
import com.webter.global.security.SessionAuthenticator;
import com.webter.global.security.SessionPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.net.URI;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 시작, 로그인 상태 조회, 가입 완료. 로그아웃은 보안 설정(SecurityConfig)이 처리한다. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthProperties properties;

	private final MemberService members;

	private final SignupService signupService;

	private final SessionAuthenticator sessions;

	/** 구글 로그인을 시작한다. 로그인 후 돌아갈 프론트엔드 경로(returnTo)를 세션에 저장하고 구글로 보낸다. */
	@GetMapping("/login/google")
	public ResponseEntity<?> loginWithGoogle(@RequestParam(required = false) String returnTo,
			HttpServletRequest request) {
		String path;
		try {
			path = ReturnPath.validate(returnTo);
		}
		catch (IllegalArgumentException ex) {
			return ResponseEntity.status(CommonErrorCode.INVALID_INPUT_VALUE.getStatus())
				.body(ApiResponse.fail(CommonErrorCode.INVALID_INPUT_VALUE));
		}
		if (!properties.googleEnabled()) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
				.body(new ApiResponse<Void>(false, "AUTH_503_01", "구글 로그인이 설정되지 않았습니다.", null));
		}
		request.getSession().setAttribute(ReturnPath.SESSION_ATTRIBUTE, path);
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/oauth2/authorization/google")).build();
	}

	/** 상태를 바꾸는 요청(POST 등)에 헤더로 보낼 CSRF 토큰 */
	@GetMapping("/csrf")
	public ApiResponse<Map<String, String>> csrf(CsrfToken token) {
		return ApiResponse.ok(Map.of("headerName", token.getHeaderName(), "token", token.getToken()));
	}

	/** 현재 로그인 상태. 로그인하지 않았어도 오류가 아니라 ANONYMOUS로 답한다. */
	@GetMapping("/session")
	public ApiResponse<SessionResponse> session(Authentication authentication, HttpServletRequest request) {
		Object principal = authentication == null ? null : authentication.getPrincipal();
		if (principal instanceof SessionPrincipal.PendingSignup pending) {
			return ApiResponse.ok(SessionResponse.signupPending(pending.email()));
		}
		if (principal instanceof SessionPrincipal.Member member) {
			var found = members.findMember(member.userId());
			if (found.isPresent()) {
				return ApiResponse.ok(SessionResponse.member(found.get()));
			}
			// 회원이 사라진 세션(탈퇴 등)은 버린다
			HttpSession session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
		}
		return ApiResponse.ok(SessionResponse.anonymous());
	}

	/** 온보딩 중 아이디 입력 칸의 중복 확인 */
	@GetMapping("/username-available")
	public ApiResponse<UsernameAvailabilityResponse> usernameAvailable(
			@RequestParam @Pattern(regexp = UserPatterns.USERNAME, message = "아이디 형식이 올바르지 않습니다.") String username) {
		return ApiResponse.ok(new UsernameAvailabilityResponse(members.isUsernameAvailable(username)));
	}

	/** 온보딩 최종 제출. 성공하면 같은 세션이 회원 로그인 상태가 된다. */
	@PostMapping("/signup")
	public ResponseEntity<ApiResponse<SessionResponse>> signup(Authentication authentication,
			@Valid @RequestBody SignupRequest body, HttpServletRequest request, HttpServletResponse response) {
		var pending = (SessionPrincipal.PendingSignup) authentication.getPrincipal();
		User user = signupService.signup(pending, body);
		sessions.establish(request, response, new SessionPrincipal.Member(user.getId()), user.getRole().name());
		MemberResponse member = MemberResponse.of(user, body.interests() == null ? List.of() : body.interests());
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(SessionResponse.member(member)));
	}

}

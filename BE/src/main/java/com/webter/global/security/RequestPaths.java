package com.webter.global.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.util.UrlPathHelper;

/** 요청 제한 판정에 쓰는 경로. 컨트롤러 매핑처럼 퍼센트 인코딩을 풀고 세미콜론 내용을 지운 값이다. */
final class RequestPaths {

	private static final UrlPathHelper PATHS = new UrlPathHelper();

	private RequestPaths() { }

	static String of(HttpServletRequest request) {
		try { return PATHS.getPathWithinApplication(request); }
		// 잘못된 인코딩은 원본 경로로 판정한다. 이런 요청은 컨트롤러에 매핑되지 않는다.
		catch (IllegalArgumentException ex) { return request.getRequestURI(); }
	}
}

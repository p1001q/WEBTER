package com.webter.global.security;

import com.webter.domain.stats.service.ClientIpHmac;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 전달 헤더를 직접 읽지 않고 신뢰 프록시 처리 후의 remoteAddr만 사용한다. */
@Component
public class AbuseInterceptor implements HandlerInterceptor, WebMvcConfigurer {

	private final AbuseProtection limits;
	private final ClientIpHmac ips;

	public AbuseInterceptor(AbuseProtection limits, ClientIpHmac ips) { this.limits = limits; this.ips = ips; }

	@Override
	public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(this).addPathPatterns("/api/**"); }

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		// 원본 URI로 비교하면 /api/%73ervices처럼 인코딩한 경로가 같은 컨트롤러에 닿으면서 제한을 건너뛴다.
		String path = RequestPaths.of(request);
		String method = request.getMethod();
		var auth = SecurityContextHolder.getContext().getAuthentication();
		String user = auth != null && auth.getPrincipal() instanceof SessionPrincipal.Member member ? member.userId().toString() : null;
		if (!method.equals("GET") && !method.equals("OPTIONS") && !method.equals("HEAD")) {
			String subject = user != null ? user : ips.hash(request.getRemoteAddr());
			limits.consume("writes", subject, limits.limit("writes-per-minute", 60), Duration.ofMinutes(1));
		}
		if (method.equals("GET") && (path.equals("/api/services") || path.equals("/api/users/search") || path.matches("/api/services/[0-9]+/launch"))) {
			limits.consume("search", ips.hash(request.getRemoteAddr()), limits.limit("search-per-minute", 60), Duration.ofMinutes(1));
		}
		else if (method.equals("POST") && path.matches("/api/services/[^/]+/reviews/guest")) {
			limits.consume("guest-review", ips.hash(request.getRemoteAddr()), limits.limit("guest-reviews-per-hour", 3), Duration.ofHours(1));
		}
		else if (user != null && ((method.equals("POST") && (path.equals("/api/services/url-check") || path.equals("/api/services")))
				|| (method.equals("PUT") && path.matches("/api/services/[0-9]+")))) {
			limits.consume("url", user, limits.limit("url-per-minute", 10), Duration.ofMinutes(1));
			limits.consume("url-ip", ips.hash(request.getRemoteAddr()), limits.limit("search-per-minute", 60), Duration.ofMinutes(1));
		}
		return true;
	}
}

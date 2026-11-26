package com.webter.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Content-Length가 없거나 거짓이어도 JSON 본문은 최대 128KiB만 메모리에 읽는다. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class JsonRequestSizeFilter extends OncePerRequestFilter {
	private static final int MAX_BYTES = 128 * 1024;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		// JSON 변환기는 application/*+json 등도 읽으므로 형식과 관계없이 API 본문 전체를 제한한다.
		// 폼·멀티파트는 서블릿 컨테이너가 파라미터로 직접 읽으므로(크기 상한 별도) 제외한다. API에 파일 업로드는 없다.
		String type = request.getContentType() == null ? "" : request.getContentType().toLowerCase(java.util.Locale.ROOT);
		if (!RequestPaths.of(request).startsWith("/api/") || type.startsWith("application/x-www-form-urlencoded")
				|| type.startsWith("multipart/")) {
			chain.doFilter(request, response); return;
		}
		byte[] bytes = request.getContentLengthLong() > MAX_BYTES ? new byte[MAX_BYTES + 1]
			: request.getInputStream().readNBytes(MAX_BYTES + 1);
		if (bytes.length > MAX_BYTES) {
			response.setStatus(413); response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
			response.getWriter().write("{\"success\":false,\"code\":\"COMMON_413_01\",\"message\":\"요청 내용이 너무 큽니다.\",\"data\":null}");
			return;
		}
		chain.doFilter(new HttpServletRequestWrapper(request) {
			@Override public ServletInputStream getInputStream() {
				ByteArrayInputStream input = new ByteArrayInputStream(bytes);
				return new ServletInputStream() {
					public int read() { return input.read(); }
					public boolean isFinished() { return input.available() == 0; }
					public boolean isReady() { return true; }
					public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException(); }
				};
			}
			@Override public java.io.BufferedReader getReader() {
				return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
			}
		}, response);
	}
}

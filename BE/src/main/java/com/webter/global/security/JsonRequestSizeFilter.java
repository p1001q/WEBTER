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
		if (!request.getRequestURI().startsWith("/api/") || request.getContentType() == null
				|| !request.getContentType().toLowerCase(java.util.Locale.ROOT).contains("application/json")) {
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

package com.webter.domain.webservice.controller;

import com.webter.domain.webservice.service.ServiceQueryService;
import com.webter.domain.webservice.service.UrlSecurityChecks;
import com.webter.global.exception.BusinessException;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** 클라이언트가 기억한 외부 주소를 바로 열지 않고 현재 공개 여부·서버 검사 결과를 확인한다. */
@RestController
@RequiredArgsConstructor
public class ServiceLaunchController {
	private final ServiceQueryService services;
	private final UrlSecurityChecks checks;

	@GetMapping("/api/services/{id}/launch")
	public void launch(@PathVariable long id, HttpServletResponse response) throws IOException {
		response.setHeader("Cache-Control", "no-store");
		response.setHeader("Referrer-Policy", "no-referrer");
		try {
			var service = services.detail(id, null);
			checks.requireChecked(service.url());
			response.sendRedirect(service.url());
		}
		catch (BusinessException ex) {
			response.setStatus(ex.getErrorCode().getStatus().value());
			response.setContentType("text/html"); response.setCharacterEncoding("UTF-8");
			// 문구는 서버의 고정 오류 메시지이며 URL·사용자 입력을 HTML에 삽입하지 않는다.
			response.getWriter().write("<!doctype html><html lang=\"ko\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>사이트를 열 수 없어요 | WEBTER</title><main><h1>사이트를 열 수 없어요</h1><p>"
				+ ex.getErrorCode().getMessage() + "</p><p>이 창을 닫고 WEBTER에서 다시 확인해 주세요.</p></main></html>");
		}
	}
}

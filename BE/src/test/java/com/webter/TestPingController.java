package com.webter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// CORS 같은 웹 설정을 검증하기 위한 테스트 전용 엔드포인트(운영 코드에는 포함되지 않는다)
@RestController
class TestPingController {

	@GetMapping("/test/ping")
	String ping() {
		return "pong";
	}

}

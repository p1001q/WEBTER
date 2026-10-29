package com.webter;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

// 통합 테스트의 공통 설정. 같은 설정을 쓰면 스프링 컨텍스트와 DB 컨테이너를 한 번만 띄운다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestPingController.class, TestErrorController.class})
abstract class IntegrationTest {

}

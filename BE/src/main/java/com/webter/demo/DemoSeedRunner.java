package com.webter.demo;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * 시연 데이터 시드를 한 번 실행하고 프로세스를 끝낸다. 일반 실행·배포에서는 빈이 만들어지지 않는다.
 * DEMO_SEED_ENABLED=true, DEMO_SEED_CONFIRM=replace-business-data, DEMO_OWNER_EMAIL(본계정 이메일)이 모두 있어야 한다.
 * 실행 방법과 초기화 범위는 BE/demo-assets/README.md에 있다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.demo-seed.enabled", havingValue = "true")
class DemoSeedRunner implements ApplicationRunner {

	static final String CONFIRM = "replace-business-data";

	private final DemoSeeder seeder;
	private final ConfigurableApplicationContext context;
	private final String ownerEmail;
	private final String confirm;

	DemoSeedRunner(DemoSeeder seeder, ConfigurableApplicationContext context,
			@org.springframework.beans.factory.annotation.Value("${app.demo-seed.owner-email:}") String ownerEmail,
			@org.springframework.beans.factory.annotation.Value("${app.demo-seed.confirm:}") String confirm) {
		this.seeder = seeder;
		this.context = context;
		this.ownerEmail = ownerEmail;
		this.confirm = confirm;
	}

	@Override
	public void run(ApplicationArguments args) {
		int code = 0;
		try {
			if (!CONFIRM.equals(confirm)) {
				throw new IllegalStateException("DEMO_SEED_CONFIRM=" + CONFIRM + " 이 없어 실행하지 않습니다.");
			}
			if (ownerEmail == null || ownerEmail.isBlank()) {
				throw new IllegalStateException("DEMO_OWNER_EMAIL이 없어 실행하지 않습니다.");
			}
			var summary = seeder.run(ownerEmail.trim(), DemoContent.plan());
			summary.forEach((name, value) -> log.info("시연 데이터 {}: {}", name, value));
			log.info("시연 데이터 시드를 마쳤습니다.");
		}
		catch (RuntimeException ex) {
			code = 1;
			log.error("시연 데이터 시드 실패: {}", ex.getMessage(), ex);
		}
		int exit = code;
		System.exit(SpringApplication.exit(context, () -> exit));
	}
}

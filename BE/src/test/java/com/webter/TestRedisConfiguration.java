package com.webter;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

// 운영 구성(IN)과 같은 Redis 7.4를 Redis 세션 테스트에서만 컨테이너로 띄운다(Docker 필요)
@TestConfiguration(proxyBeanMethods = false)
class TestRedisConfiguration {

	@Bean
	@ServiceConnection(name = "redis")
	GenericContainer<?> redisContainer() {
		return new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine")).withExposedPorts(6379);
	}

}

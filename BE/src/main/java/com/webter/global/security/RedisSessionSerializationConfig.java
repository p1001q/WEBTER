package com.webter.global.security;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.Map;
import java.util.function.BiFunction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.security.jackson.SecurityJacksonModules;
import org.springframework.session.MapSession;
import org.springframework.session.config.SessionRepositoryCustomizer;
import org.springframework.session.data.redis.RedisSessionMapper;
import org.springframework.session.data.redis.RedisSessionRepository;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

/**
 * Redis 세션의 값 직렬화 방식(JSON). 빈 이름 springSessionDefaultRedisSerializer 는 Spring Session이 세션 속성
 * 직렬화에 쓰는 이름이다. 로그인 주체, SecurityContext, 구글 인증 요청 정보, CSRF 토큰은 Spring Security가 제공하는
 * Jackson 모듈로, SessionPrincipal은 아래 mixin으로 변환한다. 허용 타입 목록에 없는 클래스는 읽지 않는다.
 * 세션에 새 타입을 넣을 때는 이 설정에 허용 타입을 추가하고 Redis 세션 테스트로 확인한다.
 */
@Slf4j
@Configuration
class RedisSessionSerializationConfig {

	@Bean
	RedisSerializer<Object> springSessionDefaultRedisSerializer() {
		var allowed = BasicPolymorphicTypeValidator.builder().allowIfSubType(SessionPrincipal.class);
		JsonMapper mapper = JsonMapper.builder()
			.addModules(SecurityJacksonModules.getModules(getClass().getClassLoader(), allowed))
			.addMixIn(SessionPrincipal.class, SessionPrincipalMixin.class)
			.addMixIn(SessionPrincipal.Member.class, SessionPrincipalMixin.class)
			.addMixIn(SessionPrincipal.PendingSignup.class, SessionPrincipalMixin.class)
			// 배포로 필드가 늘거나 줄어도 기존 세션을 읽는다
			.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
			.build();
		return new ReadFailureTolerantSerializer(new GenericJacksonJsonRedisSerializer(mapper));
	}

	/**
	 * 세션 전체를 읽을 수 없으면(생성·마지막 접근 시각, 만료 간격 같은 필수 값이 없거나 손상) 오류가 아니라 "세션 없음"으로
	 * 처리한다. 저장소가 그 세션을 삭제하고, 요청은 비로그인으로 이어진다.
	 */
	@Bean
	SessionRepositoryCustomizer<RedisSessionRepository> discardUnreadableSessions() {
		return repository -> repository
			.setRedisSessionMapper(new UnreadableSessionDiscardingMapper(new RedisSessionMapper()));
	}

	/** 타입 정보를 JSON에 함께 저장해 SessionPrincipal의 구현 클래스(Member, PendingSignup)를 구분한다. */
	@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, include = JsonTypeInfo.As.PROPERTY, property = "@class")
	abstract static class SessionPrincipalMixin {

	}

	/**
	 * 읽을 수 없는 세션 값은 오류가 아니라 "값 없음"으로 처리한다. 로그인 정보를 읽지 못한 요청은 비로그인으로 처리되어
	 * 해당 회원만 다시 로그인하면 된다(읽기 실패가 요청마다 500으로 이어지지 않게). 값 내용은 로그에 남기지 않는다.
	 */
	record ReadFailureTolerantSerializer(RedisSerializer<Object> delegate) implements RedisSerializer<Object> {

		@Override
		public byte[] serialize(Object value) throws SerializationException {
			return delegate.serialize(value);
		}

		@Override
		public Object deserialize(byte[] bytes) throws SerializationException {
			try {
				return delegate.deserialize(bytes);
			}
			catch (RuntimeException ex) {
				log.warn("읽을 수 없는 세션 값을 건너뜁니다: {}", ex.getClass().getSimpleName());
				return null;
			}
		}

	}

	record UnreadableSessionDiscardingMapper(
			BiFunction<String, Map<String, Object>, MapSession> delegate) implements BiFunction<String, Map<String, Object>, MapSession> {

		@Override
		public MapSession apply(String sessionId, Map<String, Object> entries) {
			try {
				return delegate.apply(sessionId, entries);
			}
			catch (RuntimeException ex) {
				log.warn("읽을 수 없는 세션을 폐기합니다: {}", ex.getClass().getSimpleName());
				return null;
			}
		}

	}

}

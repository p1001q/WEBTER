package com.webter.domain.user.service;

import com.webter.domain.user.dto.SavedServiceResponse;
import com.webter.domain.user.dto.UserProfileResponse;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 제작자 프로필과 마이페이지 모음 조회(저장한 서비스). */
@Service
@RequiredArgsConstructor
public class UserActivityService {

	private final UserRepository users;

	private final JdbcClient jdbc;

	/** 공개 프로필. 비공개 조치는 닉네임·소개에만 적용한다. 서비스 수·받은 좋아요는 공개된 서비스만 센다. */
	@Transactional(readOnly = true)
	public UserProfileResponse profile(UUID id) {
		User user = users.findById(id)
			.orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
		long services = jdbc.sql("SELECT count(*) FROM services WHERE owner_id = :id AND visibility_status = 'PUBLIC'")
			.param("id", id)
			.query(Long.class)
			.single();
		long likes = jdbc.sql("""
				SELECT count(*) FROM service_reactions r JOIN services s ON s.service_id = r.service_id
				WHERE s.owner_id = :id AND s.visibility_status = 'PUBLIC' AND r.reaction_type = 'LIKE'""")
			.param("id", id)
			.query(Long.class)
			.single();
		return UserProfileResponse.of(user, services, likes);
	}

	/** 내가 좋아요한 서비스의 id(좋아요 시각 오름차순). 화면이 서비스마다 조회하지 않고 한 번에 상태를 채우는 데 쓴다. */
	@Transactional(readOnly = true)
	public List<String> liked(UUID userId) {
		return jdbc.sql("""
				SELECT service_id FROM service_reactions
				WHERE user_id = :id AND reaction_type = 'LIKE' ORDER BY created_at ASC, service_id ASC""")
			.param("id", userId)
			.query((rs, i) -> String.valueOf(rs.getLong("service_id")))
			.list();
	}

	/** 내가 저장한 서비스(저장 시각 오름차순). 공개되지 않은 서비스도 포함한다(마이페이지에서 해제할 수 있어야 한다). */
	@Transactional(readOnly = true)
	public List<SavedServiceResponse> saved(UUID userId) {
		return jdbc.sql("""
				SELECT service_id, created_at FROM service_reactions
				WHERE user_id = :id AND reaction_type = 'SAVE' ORDER BY created_at ASC, service_id ASC""")
			.param("id", userId)
			.query((rs, i) -> new SavedServiceResponse(String.valueOf(rs.getLong("service_id")),
					rs.getObject("created_at", OffsetDateTime.class).toInstant()))
			.list();
	}

}

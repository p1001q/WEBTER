package com.webter.domain.webservice.service;

import com.webter.domain.upload.service.ImageVerifier;
import com.webter.domain.user.repository.UserRepository;
import com.webter.domain.webservice.dto.RegistrationDraftPayload;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.exception.ErrorCode;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class RegistrationDraftService {

	private final JdbcClient jdbc;

	private final UserRepository users;

	private final JsonMapper json;

	private final ImageVerifier images;

	public record Draft(UUID revision, Instant savedAt, RegistrationDraftPayload payload) {
	}

	@Transactional(readOnly = true)
	public Draft get(UUID userId) {
		return jdbc.sql("SELECT revision, payload::text, updated_at FROM service_registration_drafts WHERE user_id = :id")
			.param("id", userId)
			.query((rs, i) -> new Draft(rs.getObject("revision", UUID.class),
					rs.getObject("updated_at", OffsetDateTime.class).toInstant(),
					json.readValue(rs.getString("payload"), RegistrationDraftPayload.class)))
			.optional().orElse(null);
	}

	@Transactional
	public Draft save(UUID userId, UUID expectedRevision, RegistrationDraftPayload payload) {
		lock(userId);
		Draft current = get(userId);
		if (!Objects.equals(expectedRevision, current == null ? null : current.revision())) {
			throw new BusinessException(DraftError.CONFLICT);
		}
		// data/blob 주소는 브라우저를 떠나면 복원할 수 없다. 올린 저장소 주소만 보관한다.
		var urls = new ArrayList<>(payload.pv());
		if (payload.iconImg() != null) urls.add(payload.iconImg());
		if (payload.thumbImg() != null) urls.add(payload.thumbImg());
		if (urls.stream().anyMatch(url -> !images.isOwnUrl(url))) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		UUID revision = UUID.randomUUID();
		jdbc.sql("""
				INSERT INTO service_registration_drafts(user_id, revision, payload, updated_at)
				VALUES (:id, :revision, CAST(:payload AS jsonb), now())
				ON CONFLICT (user_id) DO UPDATE SET revision = excluded.revision,
				payload = excluded.payload, updated_at = excluded.updated_at
				""")
			.param("id", userId).param("revision", revision).param("payload", json.writeValueAsString(payload)).update();
		return get(userId);
	}

	@Transactional
	public void discard(UUID userId, UUID expectedRevision) {
		lock(userId);
		Draft current = get(userId);
		if (current == null) return;
		if (!Objects.equals(current.revision(), expectedRevision)) throw new BusinessException(DraftError.CONFLICT);
		consume(userId, expectedRevision);
	}

	/** 실제 등록과 같은 트랜잭션에서 사용한 초안만 지운다. 다른 창의 더 새 초안은 남긴다. */
	public void consume(UUID userId, UUID revision) {
		if (revision == null) return;
		jdbc.sql("DELETE FROM service_registration_drafts WHERE user_id = :id AND revision = :revision")
			.param("id", userId).param("revision", revision).update();
	}

	private void lock(UUID id) {
		users.findLockedById(id).orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
	}

	@RequiredArgsConstructor
	private enum DraftError implements ErrorCode {
		CONFLICT;

		public HttpStatus getStatus() { return HttpStatus.CONFLICT; }
		public String getCode() { return "DRAFT_409_01"; }
		public String getMessage() { return "다른 화면에서 임시 저장 내용이 변경됐어요. 다시 불러온 뒤 저장해 주세요."; }
	}

}

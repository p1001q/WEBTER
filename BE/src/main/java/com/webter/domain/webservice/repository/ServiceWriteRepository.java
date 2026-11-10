package com.webter.domain.webservice.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 서비스 등록·수정에서 함께 바뀌는 연결 데이터(카테고리·태그·버전 기록)와 하루 등록 횟수.
 * 서비스 행을 저장·flush한 뒤 같은 트랜잭션에서 호출한다.
 */
@Repository
@RequiredArgsConstructor
public class ServiceWriteRepository {

	private final NamedParameterJdbcTemplate jdbc;

	public record VersionRow(Long id, String version, String title, String content) {
	}

	/** 카테고리를 보낸 순서대로(첫 번째가 대표) 바꾼다. 코드는 미리 검증해 둔다. */
	public void replaceCategories(long serviceId, List<String> codes) {
		jdbc.update("DELETE FROM service_categories WHERE service_id = :id", new MapSqlParameterSource("id", serviceId));
		for (int i = 0; i < codes.size(); i++) {
			jdbc.update("""
					INSERT INTO service_categories (service_id, category_id, sort_order)
					SELECT :id, category_id, :order FROM categories WHERE code = :code""",
					new MapSqlParameterSource("id", serviceId).addValue("order", i + 1).addValue("code", codes.get(i)));
		}
	}

	/** 태그를 보낸 순서대로 바꾼다. 같은 이름(대소문자 무시)의 태그는 하나를 공유한다. */
	public void replaceTags(long serviceId, List<String> names) {
		jdbc.update("DELETE FROM service_tags WHERE service_id = :id", new MapSqlParameterSource("id", serviceId));
		for (int i = 0; i < names.size(); i++) {
			String name = names.get(i);
			MapSqlParameterSource params = new MapSqlParameterSource("name", name)
				.addValue("normalized", name.toLowerCase());
			jdbc.update("INSERT INTO tags (name, normalized_name) VALUES (:name, :normalized) "
					+ "ON CONFLICT (normalized_name) DO NOTHING", params);
			jdbc.update("INSERT INTO service_tags (service_id, tag_id, sort_order) "
					+ "SELECT :id, tag_id, :order FROM tags WHERE normalized_name = :normalized",
					params.addValue("id", serviceId).addValue("order", i + 1));
		}
	}

	/** 서비스의 현재 버전 기록 id 목록. */
	public List<Long> versionIds(long serviceId) {
		return jdbc.queryForList("SELECT service_version_id FROM service_versions WHERE service_id = :id",
				new MapSqlParameterSource("id", serviceId), Long.class);
	}

	/**
	 * 버전 기록을 보낸 목록으로 맞춘다. id가 있는 기록은 내용을 고치고(최초 일시는 유지), 없는 기록은 추가하며,
	 * 목록에 없는 기존 기록은 삭제한다.
	 */
	public void replaceVersions(long serviceId, List<VersionRow> rows) {
		List<Long> keep = new ArrayList<>();
		for (VersionRow row : rows) {
			MapSqlParameterSource params = new MapSqlParameterSource("sid", serviceId)
				.addValue("version", row.version())
				.addValue("title", row.title())
				.addValue("content", row.content());
			if (row.id() != null) {
				jdbc.update("UPDATE service_versions SET version = :version, title = :title, content = :content, "
						+ "updated_at = now() WHERE service_version_id = :vid AND service_id = :sid",
						params.addValue("vid", row.id()));
				keep.add(row.id());
			}
			else {
				Long id = jdbc.queryForObject("INSERT INTO service_versions (service_id, version, title, content) "
						+ "VALUES (:sid, :version, :title, :content) RETURNING service_version_id", params, Long.class);
				keep.add(id);
			}
		}
		if (keep.isEmpty()) {
			jdbc.update("DELETE FROM service_versions WHERE service_id = :sid", new MapSqlParameterSource("sid", serviceId));
		}
		else {
			jdbc.update("DELETE FROM service_versions WHERE service_id = :sid AND service_version_id NOT IN (:keep)",
					new MapSqlParameterSource("sid", serviceId).addValue("keep", keep));
		}
	}

	/**
	 * 오늘 서비스 등록 횟수를 하나 올린다. 한도(limit)에 이미 도달했으면 올리지 않고 false를 돌려준다.
	 * 동시에 요청이 와도 한도를 넘지 않도록 한 SQL로 처리하며, 호출한 트랜잭션이 실패하면 함께 되돌아간다.
	 */
	public boolean tryConsumeRegistration(String actorKey, java.util.UUID userId, LocalDate date, int limit) {
		return jdbc.update("""
				INSERT INTO daily_usage (actor_key, usage_date, usage_type, user_id, used_count)
				VALUES (:actor, :date, 'SERVICE_REGISTRATION', :user, 1)
				ON CONFLICT (actor_key, usage_date, usage_type)
				DO UPDATE SET used_count = daily_usage.used_count + 1, updated_at = now()
				WHERE daily_usage.used_count < :limit""",
				new MapSqlParameterSource("actor", actorKey).addValue("date", date).addValue("user", userId)
					.addValue("limit", limit)) > 0;
	}

}

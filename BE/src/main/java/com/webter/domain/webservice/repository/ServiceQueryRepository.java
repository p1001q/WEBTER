package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.dto.ScorePeriod;
import com.webter.domain.webservice.dto.ServiceSearchCondition;
import com.webter.domain.webservice.dto.ServiceSort;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 공개 서비스 목록의 조건 검색·정렬과 서비스별 집계. 조건·정렬이 점수·검색어에 따라 달라 SQL로 직접 조회한다.
 * 집계는 목록의 서비스 id를 모아 한 번에 읽는다.
 */
@Repository
@RequiredArgsConstructor
public class ServiceQueryRepository {

	public static final int CLICK_WEIGHT = 1;

	public static final int LIKE_WEIGHT = 3;

	public static final int SAVE_WEIGHT = 5;

	// 점수의 근거가 되는 기록(이용하기 클릭, 좋아요, 저장)을 시각·가중치로 모은 것
	private static final String SCORE_EVENTS = """
			SELECT service_id, occurred_at AS ts, %d AS weight FROM service_events
			WHERE event_type = 'LAUNCH' AND is_counted
			UNION ALL
			SELECT service_id, created_at AS ts,
			       CASE reaction_type WHEN 'LIKE' THEN %d ELSE %d END AS weight FROM service_reactions
			""".formatted(CLICK_WEIGHT, LIKE_WEIGHT, SAVE_WEIGHT);

	private final NamedParameterJdbcTemplate jdbc;

	public record IdPage(List<Long> ids, long total) {
	}

	public record Counts(long views, long clicks, long likes, long saves, long up, long down, long none,
			long score3, long scoreWeek, long scoreMonth) {

		public static final Counts EMPTY = new Counts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

	}

	/** 조건에 맞는 공개 서비스의 id를 정렬 순서대로 한 페이지 돌려준다. */
	public IdPage findPublicIds(ServiceSearchCondition c, Instant now) {
		MapSqlParameterSource params = new MapSqlParameterSource();
		List<String> where = new ArrayList<>();
		where.add("s.visibility_status = 'PUBLIC'");
		if (!c.categories().isEmpty()) {
			where.add("""
					EXISTS (SELECT 1 FROM service_categories sc JOIN categories cat ON cat.category_id = sc.category_id
					        WHERE sc.service_id = s.service_id AND cat.code IN (:categories))""");
			params.addValue("categories", c.categories());
		}
		if (!c.projectTypes().isEmpty()) {
			where.add("s.project_type IN (:projectTypes)");
			params.addValue("projectTypes", names(c.projectTypes()));
		}
		if (!c.prices().isEmpty()) {
			where.add("s.price_type IN (:prices)");
			params.addValue("prices", names(c.prices()));
		}
		if (!c.registrants().isEmpty()) {
			where.add("s.registrant_type IN (:registrants)");
			params.addValue("registrants", names(c.registrants()));
		}
		if (!c.availabilities().isEmpty()) {
			where.add("s.availability_status IN (:availabilities)");
			params.addValue("availabilities", names(c.availabilities()));
		}
		if (!c.devices().isEmpty()) {
			where.add("EXISTS (SELECT 1 FROM jsonb_array_elements_text(s.device_codes) d WHERE d IN (:devices))");
			params.addValue("devices", names(c.devices()));
		}
		if (!c.languages().isEmpty()) {
			where.add("EXISTS (SELECT 1 FROM jsonb_array_elements_text(s.language_codes) l WHERE l IN (:languages))");
			params.addValue("languages", names(c.languages()));
		}

		String relevance = relevance(c.query(), params);
		if (relevance != null) {
			where.add("(" + relevance + ") > 0");
		}

		String join = "";
		String order = "s.created_at DESC, s.service_id DESC";
		if (c.sort() == ServiceSort.TRENDING || c.sort() == ServiceSort.POPULAR) {
			ScorePeriod period = c.sort() == ServiceSort.TRENDING ? ScorePeriod.THREE_DAYS : c.period();
			params.addValue("since", Timestamp.from(period.since(now)));
			join = " LEFT JOIN (SELECT service_id, sum(weight) AS score FROM (" + SCORE_EVENTS
					+ ") x WHERE ts >= :since GROUP BY service_id) sc ON sc.service_id = s.service_id";
			order = "coalesce(sc.score, 0) DESC, " + order;
		}
		else if (c.sort() == ServiceSort.RELEVANCE && relevance != null) {
			order = "(" + relevance + ") DESC, " + order;
		}

		String from = " FROM services s" + join + " WHERE " + String.join(" AND ", where);
		Long total = jdbc.queryForObject("SELECT count(*)" + from, params, Long.class);
		params.addValue("limit", c.size());
		params.addValue("offset", (long) c.page() * c.size());
		List<Long> ids = jdbc.queryForList("SELECT s.service_id" + from + " ORDER BY " + order
				+ " LIMIT :limit OFFSET :offset", params, Long.class);
		return new IdPage(ids, total == null ? 0 : total);
	}

	/** 한 회원이 등록한 서비스의 id(공개 여부와 무관, 최신순). */
	public List<Long> findOwnedIds(java.util.UUID ownerId) {
		return jdbc.queryForList("SELECT service_id FROM services WHERE owner_id = :owner "
				+ "ORDER BY created_at DESC, service_id DESC", new MapSqlParameterSource("owner", ownerId), Long.class);
	}

	// 검색어의 어절마다 이름 3점, 태그 2점, 한 줄 소개·설명 1점을 더한다(어절 중 하나라도 맞으면 결과에 든다)
	private String relevance(String query, MapSqlParameterSource params) {
		if (query.isEmpty()) {
			return null;
		}
		List<String> terms = new ArrayList<>();
		int i = 0;
		for (String word : query.toLowerCase().split("\\s+")) {
			if (word.isBlank()) {
				continue;
			}
			String name = "w" + i++;
			params.addValue(name, "%" + escapeLike(word) + "%");
			terms.add("(CASE WHEN lower(s.name) LIKE :" + name + " ESCAPE '\\' THEN 3 ELSE 0 END"
					+ " + CASE WHEN EXISTS (SELECT 1 FROM service_tags st JOIN tags t ON t.tag_id = st.tag_id"
					+ " WHERE st.service_id = s.service_id AND lower(t.name) LIKE :" + name + " ESCAPE '\\') THEN 2 ELSE 0 END"
					+ " + CASE WHEN lower(s.tagline || ' ' || coalesce(s.description_markdown, '')) LIKE :" + name
					+ " ESCAPE '\\' THEN 1 ELSE 0 END)");
		}
		return terms.isEmpty() ? null : String.join(" + ", terms);
	}

	private static String escapeLike(String word) {
		return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	private static <E extends Enum<E>> List<String> names(Collection<E> values) {
		return values.stream().map(Enum::name).toList();
	}

	/** 서비스별 조회·실행·좋아요·저장·평가 수와 기간별 점수. 기록이 없는 서비스는 모두 0이다. */
	public Map<Long, Counts> counts(Collection<Long> ids, Instant now) {
		Map<Long, Counts> result = new HashMap<>();
		if (ids.isEmpty()) {
			return result;
		}
		MapSqlParameterSource params = new MapSqlParameterSource("ids", ids)
			.addValue("d3", Timestamp.from(ScorePeriod.THREE_DAYS.since(now)))
			.addValue("w", Timestamp.from(ScorePeriod.WEEK.since(now)))
			.addValue("m", Timestamp.from(ScorePeriod.MONTH.since(now)));
		Map<Long, long[]> raw = new HashMap<>();
		jdbc.query("""
				SELECT service_id,
				       count(*) FILTER (WHERE event_type = 'VIEW') AS views,
				       count(*) FILTER (WHERE event_type = 'LAUNCH') AS clicks
				FROM service_events WHERE is_counted AND service_id IN (:ids) GROUP BY service_id""", params, rs -> {
			long[] v = raw.computeIfAbsent(rs.getLong("service_id"), k -> new long[10]);
			v[0] = rs.getLong("views");
			v[1] = rs.getLong("clicks");
		});
		jdbc.query("""
				SELECT service_id,
				       count(*) FILTER (WHERE reaction_type = 'LIKE') AS likes,
				       count(*) FILTER (WHERE reaction_type = 'SAVE') AS saves
				FROM service_reactions WHERE service_id IN (:ids) GROUP BY service_id""", params, rs -> {
			long[] v = raw.computeIfAbsent(rs.getLong("service_id"), k -> new long[10]);
			v[2] = rs.getLong("likes");
			v[3] = rs.getLong("saves");
		});
		// 평가: 제작자 리뷰와 숨겨진 리뷰는 제외한다. 미설정은 글이 있는 리뷰만 센다
		jdbc.query("""
				SELECT service_id,
				       count(*) FILTER (WHERE rating = 'RECOMMEND') AS up,
				       count(*) FILTER (WHERE rating = 'NOT_RECOMMEND') AS down,
				       count(*) FILTER (WHERE rating = 'NONE' AND btrim(content) <> '') AS none
				FROM reviews WHERE visibility_status = 'PUBLIC' AND NOT is_creator_review AND service_id IN (:ids)
				GROUP BY service_id""", params, rs -> {
			long[] v = raw.computeIfAbsent(rs.getLong("service_id"), k -> new long[10]);
			v[4] = rs.getLong("up");
			v[5] = rs.getLong("down");
			v[6] = rs.getLong("none");
		});
		jdbc.query("SELECT service_id,"
				+ " coalesce(sum(CASE WHEN ts >= :d3 THEN weight END), 0) AS s3,"
				+ " coalesce(sum(CASE WHEN ts >= :w THEN weight END), 0) AS sw,"
				+ " coalesce(sum(CASE WHEN ts >= :m THEN weight END), 0) AS sm"
				+ " FROM (" + SCORE_EVENTS + ") x WHERE service_id IN (:ids) GROUP BY service_id", params, rs -> {
			long[] v = raw.computeIfAbsent(rs.getLong("service_id"), k -> new long[10]);
			v[7] = rs.getLong("s3");
			v[8] = rs.getLong("sw");
			v[9] = rs.getLong("sm");
		});
		raw.forEach((id, v) -> result.put(id, new Counts(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9])));
		return result;
	}

	/** 서비스별 카테고리 코드(선택 순서). */
	public Map<Long, List<String>> categoryCodes(Collection<Long> ids) {
		return strings(ids, """
				SELECT sc.service_id, c.code AS value FROM service_categories sc
				JOIN categories c ON c.category_id = sc.category_id
				WHERE sc.service_id IN (:ids) ORDER BY sc.service_id, sc.sort_order""");
	}

	/** 서비스별 태그 이름. */
	public Map<Long, List<String>> tagNames(Collection<Long> ids) {
		return strings(ids, """
				SELECT st.service_id, t.name AS value FROM service_tags st
				JOIN tags t ON t.tag_id = st.tag_id
				WHERE st.service_id IN (:ids) ORDER BY st.service_id, t.name""");
	}

	private Map<Long, List<String>> strings(Collection<Long> ids, String sql) {
		Map<Long, List<String>> result = new HashMap<>();
		if (ids.isEmpty()) {
			return result;
		}
		jdbc.query(sql, new MapSqlParameterSource("ids", ids), rs -> {
			result.computeIfAbsent(rs.getLong("service_id"), k -> new ArrayList<>()).add(rs.getString("value"));
		});
		return result;
	}

}

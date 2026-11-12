package com.webter.domain.review.repository;

import com.webter.domain.reaction.dto.CursorPage.Position;
import com.webter.domain.review.dto.ReviewSort;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReviewPageRepository {

	private final JdbcClient jdbc;

	public List<Position> findPage(long serviceId, ReviewSort sort, Position after, int size) {
		boolean ranked = sort == ReviewSort.RECOMMENDED;
		String sql = """
				select review_id, created_at, %s as rank
				from reviews r
				%s
				where service_id = :serviceId and visibility_status = 'PUBLIC' and content <> ''
				""".formatted(ranked ? "upvotes.total" : "0", ranked ? """
				cross join lateral (
					select count(*) as total from review_votes v where v.review_id = r.review_id and v.vote_type = 'UP'
				) upvotes
				""" : "");
		if (after != null) {
			sql += ranked ? " and (upvotes.total, created_at, review_id) < (:rank, :date, :id)"
				: " and (created_at, review_id) < (:date, :id)";
		}
		sql += " order by " + (ranked ? "rank desc, " : "") + "created_at desc, review_id desc limit :size";
		var query = jdbc.sql(sql).param("serviceId", serviceId).param("size", size);
		if (after != null) {
			query.param("date", after.date().atOffset(ZoneOffset.UTC)).param("id", after.id());
			if (ranked) {
				query.param("rank", after.rank());
			}
		}
		return query.query((rs, i) -> new Position(rs.getObject("created_at", OffsetDateTime.class).toInstant(),
			rs.getLong("review_id"), rs.getLong("rank"))).list();
	}

}

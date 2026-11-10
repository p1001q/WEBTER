package com.webter.domain.report.repository;

import com.webter.domain.comment.service.CommentService;
import com.webter.domain.report.dto.ModerationView.HiddenTarget;
import com.webter.domain.report.dto.ModerationView.TargetPreview;
import com.webter.domain.report.dto.ModerationView.TargetRef;
import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.review.repository.ReviewRepository;
import com.webter.domain.user.entity.User;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReportTargetStore {

	private final JdbcClient jdbc;
	private final ReviewRepository reviews;
	private final CommentService comments;

	/** 리뷰·답글·댓글은 일반 작성/수정/삭제와 같은 서비스 행을 잠근 뒤 다시 읽는다. */
	public Optional<Target> lock(TargetRef ref) {
		Shape shape = Shape.valueOf(ref.targetType().name());
		boolean profile = ref.targetType() == ReportTargetType.PROFILE;
		String rootTable = profile ? "users" : "services";
		String rootId = profile ? "user_id" : "service_id";
		String sql = "select " + rootId + " from " + rootTable + " where " + rootId
			+ " = (select t." + rootId + " from " + shape.table + " t where t." + shape.id + " = :id)"
			+ " for no key update";
		if (jdbc.sql(sql).param("id", id(ref)).query().optionalValue().isEmpty()) {
			return Optional.empty();
		}
		return find(ref);
	}

	public Optional<Target> find(TargetRef ref) {
		Shape shape = Shape.valueOf(ref.targetType().name());
		return jdbc.sql(shape.select() + " where t." + shape.id + " = :id and " + shape.present)
			.param("id", id(ref))
			.query((rs, row) -> readTarget(ref.targetType(), rs))
			.optional();
	}

	public Slice<HiddenTarget> temporarilyHidden(Pageable page) {
		String union = Arrays.stream(Shape.values())
			.map(shape -> shape.select() + " where t." + shape.visibility + " = 'TEMP_HIDDEN' and " + shape.present)
			.collect(Collectors.joining(" union all "));
		var rows = jdbc.sql(union + " order by target_type, target_key limit :limit offset :offset")
			.param("limit", page.getPageSize() + 1).param("offset", page.getOffset())
			.query((rs, row) -> {
				Target target = readTarget(ReportTargetType.valueOf(rs.getString("target_type")), rs);
				return new HiddenTarget(target.ref(), target.preview());
			}).list();
		int size = Math.min(rows.size(), page.getPageSize());
		return new SliceImpl<>(rows.subList(0, size), page, rows.size() > size);
	}

	public void changeVisibility(TargetRef ref, VisibilityStatus status, String reason) {
		Shape shape = Shape.valueOf(ref.targetType().name());
		jdbc.sql("update " + shape.table + " set " + shape.visibility + " = :status, " + shape.reason
				+ " = :reason where " + shape.id + " = :id")
			.param("status", status.name()).param("reason", reason).param("id", id(ref)).update();
	}

	public void delete(Target target) {
		TargetRef ref = target.ref();
		switch (ref.targetType()) {
			case REVIEW_REPLY -> reviews.removeReply(target.rowId());
			case COMMENT -> comments.removeForModeration(target.rowId());
			case SERVICE, REVIEW -> {
				Shape shape = Shape.valueOf(ref.targetType().name());
				jdbc.sql("delete from " + shape.table + " where " + shape.id + " = :id")
					.param("id", id(ref)).update();
			}
			case PROFILE -> throw new IllegalArgumentException("프로필은 회원 탈퇴와 분리한다.");
		}
	}

	private static Target readTarget(ReportTargetType type, ResultSet rs) throws SQLException {
		return new Target(new TargetRef(type, rs.getString("target_key")),
			new TargetPreview(rs.getString("title"), rs.getString("content"), rs.getObject("author_id", UUID.class),
				rs.getString("service_id"), VisibilityStatus.valueOf(rs.getString("visibility")), rs.getString("reason")),
			rs.getLong("row_id"), rs.getBoolean("parent_public"));
	}

	public static TargetRef ref(ReportTargetType type, String rawId) {
		try {
			return new TargetRef(type, id(new TargetRef(type, rawId)).toString());
		}
		catch (IllegalArgumentException ex) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
	}

	private static Object id(TargetRef ref) {
		return switch (ref.targetType()) {
			case PROFILE, REVIEW_REPLY -> {
				UUID uuid = UUID.fromString(ref.targetId());
				if (!uuid.toString().equalsIgnoreCase(ref.targetId())) {
					throw new IllegalArgumentException();
				}
				yield uuid;
			}
			case SERVICE, REVIEW, COMMENT -> {
				long id = Long.parseLong(ref.targetId());
				if (id <= 0) {
					throw new IllegalArgumentException();
				}
				yield id;
			}
		};
	}

	public record Target(TargetRef ref, TargetPreview preview, long rowId, boolean parentPublic) {

		public Report newReport(User reporter, String reason, String detail) {
			return switch (ref.targetType()) {
				case SERVICE -> Report.forService(reporter, rowId, reason, detail);
				case REVIEW -> Report.forReview(reporter, rowId, reason, detail);
				case REVIEW_REPLY -> Report.forReviewReply(reporter, UUID.fromString(ref.targetId()), reason, detail);
				case COMMENT -> Report.forComment(reporter, rowId, reason, detail);
				case PROFILE -> Report.forProfile(reporter, UUID.fromString(ref.targetId()), reason, detail);
			};
		}
	}

	/** 대상별 컬럼을 공통 운영 미리보기로 읽는다. 모든 SQL 식별자는 코드에 고정돼 있다. */
	@RequiredArgsConstructor
	private enum Shape {
		SERVICE("services", "service_id", "visibility_status", "hidden_reason", "true",
			"t.name, t.description_markdown, t.owner_id, t.service_id, t.service_id, true", ""),
		REVIEW("reviews", "review_id", "visibility_status", "hidden_reason", "t.content is not null and btrim(t.content) <> ''",
			"'리뷰', t.content, t.author_id, t.service_id, t.review_id, s.visibility_status = 'PUBLIC'",
			" join services s on s.service_id = t.service_id"),
		REVIEW_REPLY("reviews", "reply_id", "reply_visibility_status", "reply_hidden_reason", "t.reply_id is not null",
			"'제작자 답글', t.reply_content, t.reply_author_id, t.service_id, t.review_id,"
				+ " s.visibility_status = 'PUBLIC' and t.visibility_status = 'PUBLIC'",
			" join services s on s.service_id = t.service_id"),
		COMMENT("service_comments", "comment_id", "visibility_status", "hidden_reason", "t.deleted_at is null",
			"'댓글', t.content, t.author_id, t.service_id, t.comment_id,"
				+ " s.visibility_status = 'PUBLIC' and (p.comment_id is null or p.visibility_status = 'PUBLIC')",
			" join services s on s.service_id = t.service_id left join service_comments p on p.comment_id = t.parent_comment_id"),
		PROFILE("users", "user_id", "visibility_status", "hidden_reason", "true",
			"t.nickname, t.bio, t.user_id, null::bigint, null::bigint, true", "");

		private final String table;
		private final String id;
		private final String visibility;
		private final String reason;
		private final String present;
		private final String fields;
		private final String joins;

		String select() {
			return "select '" + name() + "' as target_type, t." + id + "::text as target_key, "
				+ "v.title, v.content, v.author_id, v.service_id, v.row_id, v.parent_public, t."
				+ visibility + " as visibility, t." + reason + " as reason from " + table + " t" + joins
				+ " cross join lateral (values (" + fields
				+ ")) v(title, content, author_id, service_id, row_id, parent_public)";
		}
	}
}

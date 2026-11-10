package com.webter.domain.report.dto;

import com.webter.domain.report.entity.ModerationAction;
import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportStatus;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.global.entity.VisibilityStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Slice;

public final class ModerationView {

	private ModerationView() {
	}

	public record Page<T>(List<T> items, int page, boolean hasNext) {

		public static <T> Page<T> of(Slice<T> slice) {
			return new Page<>(slice.getContent(), slice.getNumber(), slice.hasNext());
		}
	}

	public record TargetRef(ReportTargetType targetType, String targetId) {
	}

	public record TargetPreview(String title, String content, UUID authorId, String serviceId,
			VisibilityStatus visibility, String hiddenReason) {
	}

	public record ReportGroup(TargetRef target, long reportCount, long pendingCount, Instant latestAt) {
	}

	public record Queue(Page<ReportGroup> groups, long pendingCount) {
	}

	public record ReasonCount(String reason, long count) {
	}

	public record ReportEntry(String id, String reason, String detail, ReportStatus status, Instant createdAt,
			Instant reviewedAt, String resolutionNote) {

		public static ReportEntry of(Report report) {
			return new ReportEntry(report.getId().toString(), report.getReasonCode(), report.getDetail(), report.getStatus(),
				report.getCreatedAt(), report.getReviewedAt(), report.getResolutionNote());
		}
	}

	public record Detail(TargetRef target, TargetPreview preview, long reportCount, long pendingCount,
			List<ReasonCount> reasons, Page<ReportEntry> reports) {
	}

	public record HiddenTarget(TargetRef target, TargetPreview preview) {
	}

	public record Action(String id, TargetRef target, String type, String reason, UUID actorId, boolean automatic,
			Instant createdAt) {

		public static Action of(ModerationAction action) {
			return new Action(action.getId().toString(), new TargetRef(action.getTargetType(), action.getTargetKey()),
				action.getActionType(), action.getReason(), action.getActor() == null ? null : action.getActor().getId(),
				action.isAutomatic(), action.getCreatedAt());
		}
	}
}

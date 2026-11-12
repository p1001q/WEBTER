package com.webter.domain.comment.dto;

import com.webter.domain.reaction.dto.InteractionAuthor;
import java.time.Instant;

public record CommentView(String id, String sid, String parent, InteractionAuthor a, Instant date,
		String text, boolean edited, boolean deleted, boolean mine, boolean canEdit, boolean canDelete,
		boolean canReply, long replyCount) {
}

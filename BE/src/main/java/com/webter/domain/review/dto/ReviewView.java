package com.webter.domain.review.dto;

import com.webter.domain.reaction.dto.InteractionAuthor;
import com.webter.domain.review.entity.ReviewRating;
import com.webter.domain.review.entity.VoteType;
import java.time.Instant;

public record ReviewView(String id, String sid, InteractionAuthor a, ReviewRating rate, Instant date,
		String text, Reply reply, boolean edited, boolean creatorReview, boolean mine,
		boolean canEdit, boolean canDelete, boolean canReply, boolean canVote, Votes votes) {

	/** author는 답글을 단 제작자(등록자 또는 팀원)다. 작성자가 탈퇴했으면 withdrawn이 true이고 프로필 항목이 비어 있다. */
	public record Reply(String id, String text, Instant date, boolean edited, boolean withdrawn,
			InteractionAuthor author) {
	}

	public record Votes(long up, long down, VoteType mine) {

		public static final Votes EMPTY = new Votes(0, 0, null);

	}

}

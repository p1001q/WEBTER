package com.webter.domain.review.entity;

import com.webter.domain.user.entity.User;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 리뷰에 달린 제작자 답글(리뷰당 1개). reviews 테이블의 reply_* 컬럼에 함께 저장된다. */
@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewReply {

	// 답글을 지우고 다시 달아도 이전 답글 신고와 구분하기 위한 식별자
	@Column(name = "reply_id")
	private UUID replyId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "reply_author_id")
	private User author;

	@Column(name = "reply_content", length = 500)
	private String content;

	@Enumerated(EnumType.STRING)
	@Column(name = "reply_visibility_status", length = 20)
	private VisibilityStatus visibilityStatus;

	@Column(name = "reply_hidden_reason")
	private String hiddenReason;

	@Column(name = "reply_created_at")
	private Instant createdAt;

	@Column(name = "reply_updated_at")
	private Instant updatedAt;

	static ReviewReply create(User author, String content) {
		ReviewReply reply = new ReviewReply();
		Instant now = Instant.now();
		reply.replyId = UUID.randomUUID();
		reply.author = author;
		reply.content = content;
		reply.visibilityStatus = VisibilityStatus.PUBLIC;
		reply.createdAt = now;
		reply.updatedAt = now;
		return reply;
	}

}

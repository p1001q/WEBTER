package com.webter.domain.review.entity;

import com.webter.domain.user.entity.User;
import com.webter.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 회원이 리뷰 글에 남기는 추천·비추천. 회원당 리뷰 하나에 투표 하나만 갖는다. */
@Getter
@Entity
@Table(name = "review_votes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewVote extends BaseTimeEntity {

	@EmbeddedId
	private ReviewVoteId id = new ReviewVoteId();

	@MapsId("userId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	@MapsId("reviewId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "review_id")
	private Review review;

	@Enumerated(EnumType.STRING)
	@Column(name = "vote_type", nullable = false, length = 10)
	private VoteType voteType;

	@Builder
	private ReviewVote(User user, Review review, VoteType voteType) {
		this.user = user;
		this.review = review;
		this.voteType = voteType;
	}

	/** 추천에서 비추천으로 바꾸는 식으로 투표 종류를 바꾼다. */
	public void changeVote(VoteType voteType) {
		this.voteType = voteType;
	}

}

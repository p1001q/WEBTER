package com.webter.domain.review.repository;

import com.webter.domain.review.entity.Review;
import com.webter.domain.review.entity.ReviewVote;
import com.webter.domain.review.entity.ReviewVoteId;
import com.webter.domain.review.entity.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewVoteRepository extends JpaRepository<ReviewVote, ReviewVoteId> {

	long countByReviewAndVoteType(Review review, VoteType voteType);

}

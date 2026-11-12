package com.webter.domain.review.repository;

import com.webter.domain.review.entity.Review;
import com.webter.domain.review.entity.ReviewVote;
import com.webter.domain.review.entity.ReviewVoteId;
import com.webter.domain.review.entity.VoteType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReviewVoteRepository extends JpaRepository<ReviewVote, ReviewVoteId> {

	long countByReviewAndVoteType(Review review, VoteType voteType);

	List<ReviewVote> findByUser_IdAndReview_IdIn(UUID userId, Collection<Long> reviewIds);

	@Query("""
			select v.review.id as reviewId, v.voteType as type, count(v) as total from ReviewVote v
			where v.review.id in :reviewIds group by v.review.id, v.voteType
			""")
	List<VoteCount> countForReviews(Collection<Long> reviewIds);

	interface VoteCount {

		long getReviewId();

		VoteType getType();

		long getTotal();

	}

}

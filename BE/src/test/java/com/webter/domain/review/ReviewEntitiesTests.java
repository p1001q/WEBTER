package com.webter.domain.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.DomainFixtureTest;
import com.webter.domain.review.entity.AuthorKind;
import com.webter.domain.review.entity.Review;
import com.webter.domain.review.entity.ReviewRating;
import com.webter.domain.review.entity.ReviewVote;
import com.webter.domain.review.entity.ReviewVoteId;
import com.webter.domain.review.entity.VoteType;
import com.webter.domain.review.repository.ReviewRepository;
import com.webter.domain.review.repository.ReviewVoteRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.VisibilityStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

// 리뷰·제작자 답글·투표 엔티티가 V1 스키마와 맞는지, 주요 제약이 동작하는지 확인한다.
// DB 오류가 나면 같은 트랜잭션이 중단되므로 제약 위반 확인은 테스트마다 마지막에 한 번만 한다.
class ReviewEntitiesTests extends DomainFixtureTest {

	@Autowired
	ReviewRepository reviewRepository;

	@Autowired
	ReviewVoteRepository reviewVoteRepository;

	@Test
	void memberReviewGetsDefaults() {
		User owner = createUser("owner");
		User reviewer = createUser("reviewer");
		WebService service = createService(owner, "https://example.com/review");
		Review review = reviewRepository.save(memberReview(service, reviewer, ReviewRating.RECOMMEND));
		flushAndClear();

		Review found = reviewRepository.findById(review.getId()).orElseThrow();

		assertThat(found.getRating()).isEqualTo(ReviewRating.RECOMMEND);
		assertThat(found.isAnonymous()).isFalse();
		assertThat(found.isCreatorReview()).isFalse();
		assertThat(found.getVisibilityStatus()).isEqualTo(VisibilityStatus.PUBLIC);
		assertThat(found.getReply()).isNull();
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(reviewRepository.findByWebServiceAndAuthor(service, reviewer)).isPresent();
	}

	@Test
	void creatorReplyIsStoredInTheReviewRow() {
		User owner = createUser("owner");
		User reviewer = createUser("reviewer");
		WebService service = createService(owner, "https://example.com/reply");
		Review review = reviewRepository.save(memberReview(service, reviewer, ReviewRating.NONE));
		review.writeReply(owner, "리뷰 감사합니다.");
		flushAndClear();

		Review found = reviewRepository.findById(review.getId()).orElseThrow();

		assertThat(found.getReply()).isNotNull();
		assertThat(found.getReply().getContent()).isEqualTo("리뷰 감사합니다.");
		assertThat(found.getReply().getReplyId()).isNotNull();
		assertThat(found.getReply().getVisibilityStatus()).isEqualTo(VisibilityStatus.PUBLIC);
		assertThat(found.getReply().getAuthor().getId()).isEqualTo(owner.getId());
		assertThat(found.getReply().getCreatedAt()).isNotNull();
	}

	@Test
	void votesAreCountedAndCanBeChanged() {
		User owner = createUser("owner");
		User a = createUser("votera");
		User b = createUser("voterb");
		WebService service = createService(owner, "https://example.com/votes");
		Review review = reviewRepository.save(memberReview(service, owner, ReviewRating.NONE));
		reviewVoteRepository.save(ReviewVote.builder().user(a).review(review).voteType(VoteType.UP).build());
		reviewVoteRepository.save(ReviewVote.builder().user(b).review(review).voteType(VoteType.UP).build());
		flushAndClear();

		assertThat(reviewVoteRepository.countByReviewAndVoteType(review, VoteType.UP)).isEqualTo(2);

		ReviewVote vote = reviewVoteRepository.findById(new ReviewVoteId(a.getId(), review.getId())).orElseThrow();
		vote.changeVote(VoteType.DOWN);
		flushAndClear();

		assertThat(reviewVoteRepository.countByReviewAndVoteType(review, VoteType.UP)).isEqualTo(1);
		assertThat(reviewVoteRepository.countByReviewAndVoteType(review, VoteType.DOWN)).isEqualTo(1);
	}

	@Test
	void reviewIsKeptWithoutAuthorWhenMemberIsDeleted() {
		User owner = createUser("owner");
		User reviewer = createUser("leaver");
		WebService service = createService(owner, "https://example.com/leave");
		Review review = reviewRepository.save(memberReview(service, reviewer, ReviewRating.NONE));
		flushAndClear();

		em.createNativeQuery("DELETE FROM users WHERE user_id = :id").setParameter("id", reviewer.getId())
			.executeUpdate();
		em.clear();

		Review found = reviewRepository.findById(review.getId()).orElseThrow();
		assertThat(found.getAuthor()).isNull();
		assertThat(found.getContent()).isEqualTo("리뷰 내용");
	}

	@Test
	void guestReviewIsStoredWithHashAndDisplayIp() {
		WebService service = createService(createUser("owner"), "https://example.com/guest");
		reviewRepository.save(guestReview(service, "hmac-1", ReviewRating.NONE));
		flushAndClear();

		assertThat(reviewRepository.existsByWebServiceAndGuestIpHmac(service, "hmac-1")).isTrue();
		assertThat(reviewRepository.findByWebServiceOrderByCreatedAtDesc(service)).singleElement()
			.satisfies(review -> {
				assertThat(review.getAuthor()).isNull();
				assertThat(review.getAuthorKind()).isEqualTo(AuthorKind.GUEST);
				assertThat(review.getGuestIpDisplay()).isEqualTo("123.45");
			});
	}

	@Test
	void memberCanReviewAServiceOnlyOnce() {
		User owner = createUser("owner");
		User reviewer = createUser("reviewer");
		WebService service = createService(owner, "https://example.com/once");
		reviewRepository.saveAndFlush(memberReview(service, reviewer, ReviewRating.NONE));

		assertThatThrownBy(() -> reviewRepository.saveAndFlush(memberReview(service, reviewer, ReviewRating.NONE)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void sameGuestHashCannotReviewTwice() {
		WebService service = createService(createUser("owner"), "https://example.com/guest-dup");
		reviewRepository.saveAndFlush(guestReview(service, "hmac-dup", ReviewRating.NONE));

		assertThatThrownBy(() -> reviewRepository.saveAndFlush(guestReview(service, "hmac-dup", ReviewRating.NONE)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void guestCannotLeaveARating() {
		WebService service = createService(createUser("owner"), "https://example.com/guest-rating");

		assertThatThrownBy(
				() -> reviewRepository.saveAndFlush(guestReview(service, "hmac-rating", ReviewRating.RECOMMEND)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private Review memberReview(WebService service, User author, ReviewRating rating) {
		return Review.builder()
			.webService(service)
			.author(author)
			.authorKind(AuthorKind.MEMBER)
			.rating(rating)
			.content("리뷰 내용")
			.build();
	}

	private Review guestReview(WebService service, String hmac, ReviewRating rating) {
		return Review.builder()
			.webService(service)
			.authorKind(AuthorKind.GUEST)
			.guestIpHmac(hmac)
			.guestIpDisplay("123.45")
			.rating(rating)
			.content("비회원 리뷰")
			.build();
	}

}

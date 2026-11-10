package com.webter.domain.review.service;

import static com.webter.domain.reaction.service.InteractionText.requireContent;
import static com.webter.domain.review.entity.ReviewRating.NONE;

import com.webter.domain.notification.service.NotificationPublisher;
import com.webter.domain.reaction.dto.CursorPage;
import com.webter.domain.reaction.dto.CursorPage.Position;
import com.webter.domain.reaction.dto.InteractionAuthor;
import com.webter.domain.reaction.exception.InteractionErrorCode;
import com.webter.domain.reaction.service.ServiceInteractionAccess;
import com.webter.domain.reaction.service.ServiceInteractionAccess.WriteAccess;
import com.webter.domain.review.dto.ReviewInput;
import com.webter.domain.review.dto.ReviewSort;
import com.webter.domain.review.dto.ReviewView;
import com.webter.domain.review.dto.ReviewView.Reply;
import com.webter.domain.review.dto.ReviewView.Votes;
import com.webter.domain.review.entity.AuthorKind;
import com.webter.domain.review.entity.Review;
import com.webter.domain.review.entity.ReviewRating;
import com.webter.domain.review.entity.ReviewVote;
import com.webter.domain.review.entity.ReviewVoteId;
import com.webter.domain.review.entity.VoteType;
import com.webter.domain.review.repository.ReviewPageRepository;
import com.webter.domain.review.repository.ReviewRepository;
import com.webter.domain.review.repository.ReviewVoteRepository;
import com.webter.domain.stats.service.ClientIpHmac;
import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

	private final ServiceInteractionAccess access;
	private final ReviewRepository reviews;
	private final ReviewPageRepository pages;
	private final ReviewVoteRepository votes;
	private final EntityManager em;
	private final ClientIpHmac clientIp;
	private final NotificationPublisher notifications;

	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public CursorPage<ReviewView> list(long serviceId, UUID viewerId, ReviewSort sort, String cursor, int limit) {
		WebService service = access.read(serviceId);
		CursorPage.checkLimit(limit);
		String scope = "review:" + serviceId + ":" + sort;
		var positions = pages.findPage(serviceId, sort, Position.decode(cursor, scope), limit + 1);
		if (positions.isEmpty()) {
			return new CursorPage<>(List.of(), null);
		}
		var page = positions.subList(0, Math.min(positions.size(), limit));
		var ids = page.stream().map(Position::id).toList();
		var byId = reviews.findByIdIn(ids).stream().collect(Collectors.toMap(Review::getId, Function.identity()));
		var summaries = summaries(ids, viewerId);
		boolean canWrite = access.canWrite(viewerId);
		boolean maker = canWrite && access.isMaker(service, viewerId);
		var items = ids.stream()
			.map(id -> view(byId.get(id), viewerId, maker, canWrite, summaries.getOrDefault(id, Votes.EMPTY)))
			.toList();
		return new CursorPage<>(items, positions.size() > limit ? page.getLast().encode(scope) : null);
	}

	@Transactional(readOnly = true)
	public ReviewView mine(long serviceId, UUID viewerId) {
		WebService service = access.read(serviceId);
		if (viewerId == null) {
			return null;
		}
		boolean canWrite = access.canWrite(viewerId);
		return reviews.findByWebServiceAndAuthor_Id(service, viewerId)
			.filter(ReviewService::isPublic)
			.map(review -> view(review, viewerId, canWrite && access.isMaker(service, viewerId), canWrite, summary(review, viewerId)))
			.orElse(null);
	}

	/** 내가 쓴 리뷰(최근 순, 공개된 서비스의 글이 있는 리뷰만). 마이페이지에서 서비스를 가리지 않고 모아 본다. */
	@Transactional(readOnly = true)
	public List<ReviewView> myReviews(UUID viewerId, int limit) {
		CursorPage.checkLimit(limit);
		var mine = reviews.findMine(viewerId, org.springframework.data.domain.PageRequest.of(0, limit));
		var summaries = summaries(mine.stream().map(Review::getId).toList(), viewerId);
		boolean canWrite = access.canWrite(viewerId);
		return mine.stream()
			.map(review -> view(review, viewerId, false, canWrite, summaries.getOrDefault(review.getId(), Votes.EMPTY)))
			.toList();
	}

	@Transactional
	public ReviewView create(long serviceId, UUID viewerId, ReviewInput input) {
		var context = access.write(serviceId, viewerId);
		String text = requireContent(input.text());
		boolean anon = Boolean.TRUE.equals(input.anon());
		if (anon && (context.maker() || !context.service().isAllowAnonymousReviews())) {
			throw new BusinessException(InteractionErrorCode.ANONYMOUS_NOT_ALLOWED);
		}
		Review review = reviews.findByWebServiceAndAuthor(context.service(), context.member()).orElse(null);
		if (review != null && (!isPublic(review) || review.hasContent())) {
			throw new BusinessException(InteractionErrorCode.REVIEW_ALREADY_EXISTS);
		}
		ReviewRating rate = reviewRate(context.maker(), input.rate(), review == null ? NONE : review.getRating());
		if (review == null) {
			review = reviews.save(newReview(context, rate, text, anon));
		}
		else {
			reviews.publish(review.getId(), text, rate.name(), anon, context.maker());
			em.refresh(review);
		}
		notifications.reviewCreated(context.service(), review.getId(), context.member(), anon);
		return view(review, viewerId, context.maker(), true, Votes.EMPTY);
	}

	@Transactional
	public ReviewView createGuest(long serviceId, String remoteAddress, ReviewInput input) {
		WebService service = access.lockPublic(serviceId);
		if (!service.isAllowGuestReviews()) {
			throw new BusinessException(InteractionErrorCode.GUEST_REVIEW_NOT_ALLOWED);
		}
		if ((input.rate() != null && input.rate() != NONE) || Boolean.TRUE.equals(input.anon())) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		String text = requireContent(input.text());
		var address = clientIp.guestReview(remoteAddress);
		if (reviews.existsByWebServiceAndGuestIpHmac(service, address.hash())) {
			throw new BusinessException(InteractionErrorCode.GUEST_REVIEW_ALREADY_EXISTS);
		}
		var review = reviews.save(Review.builder().webService(service).authorKind(AuthorKind.GUEST)
			.guestIpHmac(address.hash()).guestIpDisplay(address.display()).rating(NONE).content(text).build());
		notifications.reviewCreated(service, review.getId(), null, false);
		return view(review, null, false, false, Votes.EMPTY);
	}

	@Transactional
	public ReviewView update(long serviceId, long reviewId, UUID viewerId, ReviewInput input) {
		var context = access.write(serviceId, viewerId);
		Review review = findWritten(context.service(), reviewId);
		requireAuthor(review, viewerId);
		ReviewRating rate = reviewRate(context.maker(), input.rate(), review.getRating());
		review.update(rate, requireContent(input.text()), context.maker());
		reviews.flush();
		return view(review, viewerId, context.maker(), true, summary(review, viewerId));
	}

	@Transactional
	public void delete(long serviceId, long reviewId, UUID viewerId) {
		var context = access.write(serviceId, viewerId);
		Review review = findWritten(context.service(), reviewId);
		requireAuthor(review, viewerId);
		reviews.delete(review);
	}

	@Transactional
	public ReviewView putRating(long serviceId, UUID viewerId, ReviewRating rate) {
		if (rate == null || rate == NONE) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		var context = access.write(serviceId, viewerId);
		Review review = standalone(context);
		if (review == null) {
			review = reviews.save(newReview(context, rate, "", false));
		}
		else {
			review.update(rate, "", false);
			reviews.flush();
		}
		return view(review, viewerId, false, true, Votes.EMPTY);
	}

	@Transactional
	public void deleteRating(long serviceId, UUID viewerId) {
		var context = access.write(serviceId, viewerId);
		Review review = standalone(context);
		if (review != null) {
			reviews.delete(review);
		}
	}

	@Transactional
	public Votes setVote(long serviceId, long reviewId, UUID viewerId, VoteType type) {
		var context = access.write(serviceId, viewerId);
		Review review = findWritten(context.service(), reviewId);
		if (!mayVote(review, viewerId)) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		var voteId = new ReviewVoteId(viewerId, reviewId);
		if (type == null) {
			votes.deleteById(voteId);
		}
		else {
			var prior = votes.findById(voteId).orElse(null);
			if (prior == null) {
				votes.save(ReviewVote.builder().user(context.member()).review(review).voteType(type).build());
			}
			else {
				prior.changeVote(type);
			}
		}
		votes.flush();
		return summary(review, viewerId);
	}

	@Transactional
	public ReviewView setReply(long serviceId, long reviewId, UUID viewerId, String text) {
		var context = access.write(serviceId, viewerId);
		Review review = findWritten(context.service(), reviewId);
		if (!context.maker() || isAuthor(review, viewerId)) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		if (review.getReply() != null && review.getReply().getVisibilityStatus() != VisibilityStatus.PUBLIC) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
		boolean firstReply = review.getReply() == null;
		if (text == null) {
			reviews.removeReply(reviewId);
		}
		else {
			reviews.saveReply(reviewId, UUID.randomUUID(), viewerId, requireContent(text));
		}
		em.refresh(review);
		if (text != null && firstReply) {
			notifications.reviewReply(context.service(), review.getId(), review.getAuthor(), context.member());
		}
		return view(review, viewerId, true, true, summary(review, viewerId));
	}

	private Review standalone(WriteAccess context) {
		if (context.maker()) {
			throw new BusinessException(InteractionErrorCode.OWN_SERVICE);
		}
		if (context.service().getAvailabilityStatus() != AvailabilityStatus.AVAILABLE) {
			throw new BusinessException(InteractionErrorCode.RATING_UNAVAILABLE);
		}
		var review = reviews.findByWebServiceAndAuthor(context.service(), context.member()).orElse(null);
		if (review != null && (!isPublic(review) || review.hasContent())) {
			throw new BusinessException(InteractionErrorCode.EDIT_REVIEW_REQUIRED);
		}
		return review;
	}

	private Review findWritten(WebService service, long id) {
		return reviews.findByIdAndWebService(id, service).filter(ReviewService::isPublic).filter(Review::hasContent)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
	}

	private static Review newReview(WriteAccess context, ReviewRating rate, String text, boolean anon) {
		return Review.builder().webService(context.service()).author(context.member()).authorKind(AuthorKind.MEMBER)
			.rating(rate).content(text).anonymous(anon).creatorReview(context.maker()).build();
	}

	private static ReviewRating reviewRate(boolean maker, ReviewRating requested, ReviewRating fallback) {
		if (maker && requested != null && requested != NONE) {
			throw new BusinessException(InteractionErrorCode.OWN_SERVICE);
		}
		return maker ? NONE : requested == null ? fallback : requested;
	}

	private static boolean isPublic(Review review) {
		return review.getVisibilityStatus() == VisibilityStatus.PUBLIC;
	}

	private static boolean isAuthor(Review review, UUID viewerId) {
		return viewerId != null && review.getAuthor() != null && viewerId.equals(review.getAuthor().getId());
	}

	private static void requireAuthor(Review review, UUID viewerId) {
		if (!isAuthor(review, viewerId)) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
	}

	private static boolean mayVote(Review review, UUID viewerId) {
		return viewerId != null && review.hasContent() && review.getAuthorKind() == AuthorKind.MEMBER
			&& !isAuthor(review, viewerId);
	}

	private static ReviewView view(Review review, UUID viewerId, boolean maker, boolean canWrite, Votes votes) {
		boolean mine = isAuthor(review, viewerId);
		boolean written = review.hasContent();
		var author = review.getAuthorKind() == AuthorKind.GUEST ? InteractionAuthor.guest(review.getGuestIpDisplay())
			: InteractionAuthor.member(review.getAuthor(), review.isAnonymous());
		var reply = review.getReply();
		Reply visibleReply = reply == null || reply.getVisibilityStatus() != VisibilityStatus.PUBLIC ? null
			: new Reply(reply.getContent(), reply.getCreatedAt(), reply.getUpdatedAt().isAfter(reply.getCreatedAt()));
		return new ReviewView(review.getId().toString(), review.getWebService().getId().toString(), author,
			review.getRating(), review.getCreatedAt(), review.getContent(), visibleReply,
			written && review.getUpdatedAt().isAfter(review.getCreatedAt()), review.isCreatorReview(), mine,
			canWrite && mine && written, canWrite && mine && written, maker && !mine && written
				&& (reply == null || reply.getVisibilityStatus() == VisibilityStatus.PUBLIC),
			canWrite && mayVote(review, viewerId), votes);
	}

	private Votes summary(Review review, UUID viewerId) {
		return summaries(List.of(review.getId()), viewerId).getOrDefault(review.getId(), Votes.EMPTY);
	}

	private Map<Long, Votes> summaries(List<Long> ids, UUID viewerId) {
		Map<Long, Votes> result = new HashMap<>();
		for (var row : votes.countForReviews(ids)) {
			Votes current = result.getOrDefault(row.getReviewId(), Votes.EMPTY);
			result.put(row.getReviewId(), row.getType() == VoteType.UP ? new Votes(row.getTotal(), current.down(), null)
				: new Votes(current.up(), row.getTotal(), null));
		}
		if (viewerId != null) {
			for (var vote : votes.findByUser_IdAndReview_IdIn(viewerId, ids)) {
				long id = vote.getReview().getId();
				Votes current = result.getOrDefault(id, Votes.EMPTY);
				result.put(id, new Votes(current.up(), current.down(), vote.getVoteType()));
			}
		}
		return result;
	}

}

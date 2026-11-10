package com.webter.domain.review.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.reaction.dto.CursorPage;
import com.webter.domain.review.dto.ReviewInput;
import com.webter.domain.review.dto.ReviewSort;
import com.webter.domain.review.dto.ReviewView;
import com.webter.domain.review.dto.ReviewView.Votes;
import com.webter.domain.review.entity.ReviewRating;
import com.webter.domain.review.entity.VoteType;
import com.webter.domain.review.service.ReviewService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services/{serviceId}")
@RequiredArgsConstructor
public class ReviewController {

	private final ReviewService reviews;

	@GetMapping("/reviews")
	public ApiResponse<CursorPage<ReviewView>> list(@PathVariable long serviceId,
			@RequestParam(defaultValue = "RECOMMENDED") ReviewSort sort, @RequestParam(required = false) String cursor,
			@RequestParam(defaultValue = "20") int limit, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.list(serviceId, viewerId(member), sort, cursor, limit));
	}

	@GetMapping("/reviews/me")
	public ApiResponse<ReviewView> mine(@PathVariable long serviceId, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.mine(serviceId, viewerId(member)));
	}

	@PostMapping("/reviews")
	public ApiResponse<ReviewView> create(@PathVariable long serviceId, @RequestBody ReviewInput input,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.create(serviceId, viewerId(member), input));
	}

	@PostMapping("/reviews/guest")
	public ApiResponse<ReviewView> createGuest(@PathVariable long serviceId, @RequestBody ReviewInput input,
			HttpServletRequest request) {
		return ApiResponse.ok(reviews.createGuest(serviceId, request.getRemoteAddr(), input));
	}

	@PatchMapping("/reviews/{reviewId}")
	public ApiResponse<ReviewView> update(@PathVariable long serviceId, @PathVariable long reviewId,
			@RequestBody ReviewInput input, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.update(serviceId, reviewId, viewerId(member), input));
	}

	@DeleteMapping("/reviews/{reviewId}")
	public ApiResponse<Void> delete(@PathVariable long serviceId, @PathVariable long reviewId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		reviews.delete(serviceId, reviewId, viewerId(member));
		return ApiResponse.ok();
	}

	@PutMapping("/rating")
	public ApiResponse<ReviewView> putRating(@PathVariable long serviceId, @Valid @RequestBody RatingInput input,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.putRating(serviceId, viewerId(member), input.rate()));
	}

	@DeleteMapping("/rating")
	public ApiResponse<Void> deleteRating(@PathVariable long serviceId, @AuthenticationPrincipal SessionPrincipal.Member member) {
		reviews.deleteRating(serviceId, viewerId(member));
		return ApiResponse.ok();
	}

	@PutMapping("/reviews/{reviewId}/vote")
	public ApiResponse<Votes> vote(@PathVariable long serviceId, @PathVariable long reviewId,
			@Valid @RequestBody VoteInput input, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.setVote(serviceId, reviewId, viewerId(member), input.vote()));
	}

	@DeleteMapping("/reviews/{reviewId}/vote")
	public ApiResponse<Votes> unvote(@PathVariable long serviceId, @PathVariable long reviewId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.setVote(serviceId, reviewId, viewerId(member), null));
	}

	@PutMapping("/reviews/{reviewId}/reply")
	public ApiResponse<ReviewView> reply(@PathVariable long serviceId, @PathVariable long reviewId,
			@Valid @RequestBody ReplyInput input, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.setReply(serviceId, reviewId, viewerId(member), input.text()));
	}

	@DeleteMapping("/reviews/{reviewId}/reply")
	public ApiResponse<ReviewView> deleteReply(@PathVariable long serviceId, @PathVariable long reviewId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(reviews.setReply(serviceId, reviewId, viewerId(member), null));
	}

	public record RatingInput(@NotNull ReviewRating rate) {
	}

	public record VoteInput(@NotNull VoteType vote) {
	}

	public record ReplyInput(@NotNull String text) {
	}

}

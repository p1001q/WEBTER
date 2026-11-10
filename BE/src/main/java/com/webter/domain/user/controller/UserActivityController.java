package com.webter.domain.user.controller;

import com.webter.domain.comment.dto.CommentView;
import com.webter.domain.comment.service.CommentService;
import com.webter.domain.review.dto.ReviewView;
import com.webter.domain.review.service.ReviewService;
import com.webter.domain.user.dto.SavedServiceResponse;
import com.webter.domain.user.dto.UserProfileResponse;
import com.webter.domain.user.service.UserActivityService;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 제작자 프로필(공개)과 마이페이지의 저장한 서비스·내 리뷰·내 댓글(본인). */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserActivityController {

	private final UserActivityService activity;

	private final ReviewService reviews;

	private final CommentService comments;

	@GetMapping("/{id}")
	public ApiResponse<UserProfileResponse> profile(@PathVariable UUID id) {
		return ApiResponse.ok(activity.profile(id));
	}

	/** 내가 좋아요한 서비스의 id(좋아요 시각 오름차순). */
	@GetMapping("/me/liked")
	public ApiResponse<List<String>> liked(@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(activity.liked(member.userId()));
	}

	@GetMapping("/me/saved")
	public ApiResponse<List<SavedServiceResponse>> saved(@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(activity.saved(member.userId()));
	}

	/** 내가 쓴 리뷰(최근 순). limit은 1~100이고 기본 100이다. */
	@GetMapping("/me/reviews")
	public ApiResponse<List<ReviewView>> myReviews(@AuthenticationPrincipal SessionPrincipal.Member member,
			@RequestParam(defaultValue = "100") int limit) {
		return ApiResponse.ok(reviews.myReviews(member.userId(), limit));
	}

	/** 내가 쓴 댓글·답글(최근 순). limit은 1~100이고 기본 100이다. */
	@GetMapping("/me/comments")
	public ApiResponse<List<CommentView>> myComments(@AuthenticationPrincipal SessionPrincipal.Member member,
			@RequestParam(defaultValue = "100") int limit) {
		return ApiResponse.ok(comments.myComments(member.userId(), limit));
	}

}

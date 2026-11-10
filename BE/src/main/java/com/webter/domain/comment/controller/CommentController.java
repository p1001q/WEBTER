package com.webter.domain.comment.controller;

import static com.webter.domain.reaction.service.ServiceInteractionAccess.viewerId;

import com.webter.domain.comment.dto.CommentInput;
import com.webter.domain.comment.dto.CommentView;
import com.webter.domain.comment.service.CommentService;
import com.webter.domain.reaction.dto.CursorPage;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services/{serviceId}/comments")
@RequiredArgsConstructor
public class CommentController {

	private final CommentService comments;

	@GetMapping
	public ApiResponse<CursorPage<CommentView>> list(@PathVariable long serviceId,
			@RequestParam(required = false) Long parentId, @RequestParam(required = false) String cursor,
			@RequestParam(defaultValue = "20") int limit, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(comments.list(serviceId, viewerId(member), parentId, cursor, limit));
	}

	@PostMapping
	public ApiResponse<CommentView> create(@PathVariable long serviceId, @RequestBody CommentInput input,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(comments.create(serviceId, viewerId(member), input));
	}

	@PatchMapping("/{commentId}")
	public ApiResponse<CommentView> update(@PathVariable long serviceId, @PathVariable long commentId,
			@RequestBody CommentInput input, @AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(comments.update(serviceId, commentId, viewerId(member), input));
	}

	@DeleteMapping("/{commentId}")
	public ApiResponse<Void> delete(@PathVariable long serviceId, @PathVariable long commentId,
			@AuthenticationPrincipal SessionPrincipal.Member member) {
		comments.delete(serviceId, commentId, viewerId(member));
		return ApiResponse.ok();
	}

}

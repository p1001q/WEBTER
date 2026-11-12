package com.webter.domain.notification.controller;

import com.webter.domain.notification.dto.NotificationView;
import com.webter.domain.notification.service.NotificationService;
import com.webter.domain.reaction.dto.CursorPage;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 내 알림. 가입을 완료한 회원만 쓰며 본인 알림만 다룬다(SecurityConfig의 기본 규칙). */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationService notifications;

	@GetMapping
	public ApiResponse<CursorPage<NotificationView>> list(@AuthenticationPrincipal SessionPrincipal.Member member,
			@RequestParam(defaultValue = "false") boolean unread, @RequestParam(required = false) String cursor,
			@RequestParam(defaultValue = "20") int limit) {
		return ApiResponse.ok(notifications.list(member.userId(), unread, cursor, limit));
	}

	@GetMapping("/unread-count")
	public ApiResponse<UnreadCount> unreadCount(@AuthenticationPrincipal SessionPrincipal.Member member) {
		return ApiResponse.ok(new UnreadCount(notifications.unreadCount(member.userId())));
	}

	@PutMapping("/read-all")
	public ApiResponse<Void> readAll(@AuthenticationPrincipal SessionPrincipal.Member member) {
		notifications.markAllRead(member.userId());
		return ApiResponse.ok();
	}

	@PutMapping("/{id}/read")
	public ApiResponse<Void> read(@PathVariable long id, @AuthenticationPrincipal SessionPrincipal.Member member) {
		notifications.markRead(member.userId(), id);
		return ApiResponse.ok();
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable long id, @AuthenticationPrincipal SessionPrincipal.Member member) {
		notifications.delete(member.userId(), id);
		return ApiResponse.ok();
	}

	@DeleteMapping
	public ApiResponse<Void> deleteAll(@AuthenticationPrincipal SessionPrincipal.Member member) {
		notifications.deleteAll(member.userId());
		return ApiResponse.ok();
	}

	public record UnreadCount(long count) {
	}

}

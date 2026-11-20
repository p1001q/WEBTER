package com.webter.domain.user.controller;

import com.webter.domain.user.service.ReflectionService;
import com.webter.domain.user.service.ReflectionService.Entry;
import com.webter.domain.user.service.ReflectionService.Page;
import com.webter.global.response.ApiResponse;
import com.webter.global.security.SessionPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/reflections")
@RequiredArgsConstructor
public class ReflectionController {

	private final ReflectionService reflections;

	public record Create(@NotNull @Positive Long serviceId, @NotBlank @Size(max = 100) String title,
			@NotBlank @Size(max = 10000) String body) {
	}

	public record Update(@NotNull UUID revision, @Positive Long serviceId, @NotBlank @Size(max = 100) String title,
			@NotBlank @Size(max = 10000) String body) {
	}

	@GetMapping
	public ApiResponse<Page> list(@AuthenticationPrincipal SessionPrincipal.Member member,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) Long serviceId) {
		return ApiResponse.ok(reflections.list(member.userId(), page, size, serviceId));
	}

	@GetMapping("/{id}")
	public ApiResponse<Entry> get(@AuthenticationPrincipal SessionPrincipal.Member member, @PathVariable UUID id) {
		return ApiResponse.ok(reflections.get(member.userId(), id));
	}

	@PostMapping
	public ApiResponse<Entry> create(@AuthenticationPrincipal SessionPrincipal.Member member, @Valid @RequestBody Create body) {
		return ApiResponse.ok(reflections.create(member.userId(), body.serviceId(), body.title(), body.body()));
	}

	@PutMapping("/{id}")
	public ApiResponse<Entry> update(@AuthenticationPrincipal SessionPrincipal.Member member, @PathVariable UUID id,
			@Valid @RequestBody Update body) {
		return ApiResponse.ok(reflections.update(member.userId(), id, body.revision(), body.serviceId(), body.title(), body.body()));
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@AuthenticationPrincipal SessionPrincipal.Member member, @PathVariable UUID id,
			@RequestParam UUID revision) {
		reflections.delete(member.userId(), id, revision);
		return ApiResponse.ok();
	}

}

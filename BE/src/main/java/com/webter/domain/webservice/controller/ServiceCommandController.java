package com.webter.domain.webservice.controller;

import com.webter.domain.webservice.dto.AvailabilityRequest;
import com.webter.domain.webservice.dto.ServiceRequest;
import com.webter.domain.webservice.dto.ServiceResponse;
import com.webter.domain.webservice.dto.UrlCheckRequest;
import com.webter.domain.webservice.dto.UrlCheckResponse;
import com.webter.domain.webservice.dto.VersionRequest;
import com.webter.domain.webservice.service.ServiceCommandService;
import com.webter.domain.webservice.service.ServiceQueryService;
import com.webter.domain.webservice.service.ServiceQueryService.Viewer;
import com.webter.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 서비스 등록·수정·삭제와 운영 상태·버전 기록 관리. 가입을 완료한 회원만 쓸 수 있고 수정·삭제는 등록자와 관리자만 한다. */
@RestController
@RequiredArgsConstructor
public class ServiceCommandController {

	private final ServiceCommandService commands;

	private final ServiceQueryService queries;

	@PostMapping("/api/services")
	public ResponseEntity<ApiResponse<ServiceResponse>> create(@Valid @RequestBody ServiceRequest body,
			Authentication authentication) {
		Viewer viewer = Viewers.require(authentication);
		long id = commands.create(viewer.userId(), body);
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(queries.detail(id, viewer)));
	}

	@PutMapping("/api/services/{id}")
	public ApiResponse<ServiceResponse> update(@PathVariable long id, @Valid @RequestBody ServiceRequest body,
			Authentication authentication) {
		Viewer viewer = Viewers.require(authentication);
		commands.update(id, viewer, body);
		return ApiResponse.ok(queries.detail(id, viewer));
	}

	@DeleteMapping("/api/services/{id}")
	public ApiResponse<Void> delete(@PathVariable long id, Authentication authentication) {
		commands.delete(id, Viewers.require(authentication));
		return ApiResponse.ok();
	}

	/** 운영 중/운영 중지 전환. 운영 중지는 사유가 필요하다. */
	@PutMapping("/api/services/{id}/availability")
	public ApiResponse<ServiceResponse> availability(@PathVariable long id,
			@Valid @RequestBody AvailabilityRequest body, Authentication authentication) {
		Viewer viewer = Viewers.require(authentication);
		commands.changeAvailability(id, viewer, body);
		return ApiResponse.ok(queries.detail(id, viewer));
	}

	/** 버전 기록을 보낸 목록으로 맞춘다(id가 있으면 수정, 없으면 추가, 빠진 기록은 삭제). */
	@PutMapping("/api/services/{id}/versions")
	public ApiResponse<ServiceResponse> versions(@PathVariable long id,
			@RequestBody List<@Valid VersionRequest> body, Authentication authentication) {
		Viewer viewer = Viewers.require(authentication);
		commands.replaceVersions(id, viewer, body);
		return ApiResponse.ok(queries.detail(id, viewer));
	}

	/** 서비스 주소 검사(형식·중복·접속). 결과는 항상 200이고 state로 구분한다. */
	@PostMapping("/api/services/url-check")
	public ApiResponse<UrlCheckResponse> checkUrl(@Valid @RequestBody UrlCheckRequest body,
			Authentication authentication) {
		Viewers.require(authentication);
		return ApiResponse.ok(commands.checkUrl(body));
	}

	/** 내가 등록한 서비스 전체(비공개·운영 중지 포함, 최신순). */
	@GetMapping("/api/users/me/services")
	public ApiResponse<List<ServiceResponse>> mine(Authentication authentication) {
		return ApiResponse.ok(queries.mine(Viewers.require(authentication)));
	}

}

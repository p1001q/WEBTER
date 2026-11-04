package com.webter.domain.user.service;

import com.webter.domain.category.entity.Category;
import com.webter.domain.category.service.CategoryService;
import com.webter.domain.user.dto.MemberResponse;
import com.webter.domain.user.dto.UpdateProfileRequest;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.domain.user.repository.UserInterestRepository;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 가입을 마친 회원의 계정 설정 수정과 탈퇴 */
@Service
@RequiredArgsConstructor
public class AccountService {

	private final UserRepository users;

	private final UserInterestRepository interests;

	private final CategoryService categories;

	@Transactional
	public MemberResponse updateProfile(UUID userId, UpdateProfileRequest request) {
		User user = users.findById(userId).orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
		var links = ProfileLinks.toMap(request.links());
		List<Category> selected = categories.resolveActive(request.interests());
		// 대소문자만 바꾸는 경우는 본인 아이디라 중복이 아니다
		if (!request.username().equalsIgnoreCase(user.getUsername())
				&& users.existsByUsernameIgnoreCase(request.username())) {
			throw new BusinessException(UserErrorCode.USERNAME_DUPLICATED);
		}
		user.updateProfile(request.username(), request.nickname(), request.bio() == null ? "" : request.bio(), links);
		try {
			users.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException e) {
			// 사전 확인과 저장 사이에 같은 아이디가 먼저 저장된 경우(동시 요청)
			if (String.valueOf(e.getMostSpecificCause().getMessage()).contains("ux_users_username_ci")) {
				throw new BusinessException(UserErrorCode.USERNAME_DUPLICATED);
			}
			throw e;
		}
		interests.deleteAll(interests.findAllWithCategoryByUserId(userId));
		interests.flush();
		short order = 1;
		for (Category category : selected) {
			interests.save(UserInterest.builder().user(user).category(category).sortOrder(order++).build());
		}
		interests.flush();
		return MemberResponse.of(user, selected.stream().map(Category::getCode).toList());
	}

	/**
	 * 회원 탈퇴. 회원 행을 지우면 DB 외래키 규칙이 정책을 따른다: 등록한 서비스·좋아요·저장·동의 이력·알림은 삭제되고,
	 * 작성한 리뷰·댓글은 작성자만 비워져 "탈퇴한 사용자"로 남는다(정책서 2.1).
	 */
	@Transactional
	public void withdraw(UUID userId) {
		if (!users.existsById(userId)) {
			throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
		}
		users.deleteById(userId);
		users.flush();
	}

}

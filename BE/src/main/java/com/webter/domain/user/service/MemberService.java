package com.webter.domain.user.service;

import com.webter.domain.user.dto.MemberResponse;
import com.webter.domain.user.entity.OAuthProvider;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.repository.OAuthIdentityRepository;
import com.webter.domain.user.repository.UserInterestRepository;
import com.webter.domain.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 로그인 판정과 현재 회원 조회 */
@Service
@RequiredArgsConstructor
public class MemberService {

	private final UserRepository users;

	private final OAuthIdentityRepository identities;

	private final UserInterestRepository interests;

	/** 이미 가입한 구글 계정이면 회원을 돌려준다. 없으면 비어 있다(온보딩이 필요한 신규 사용자). */
	@Transactional(readOnly = true)
	public Optional<User> findByGoogleSubject(String subject) {
		return identities.findByProviderAndProviderSubject(OAuthProvider.GOOGLE, subject).map(identity -> {
			User user = identity.getUser();
			// 트랜잭션 안에서 프록시를 초기화해 둔다
			user.getRole();
			return user;
		});
	}

	@Transactional(readOnly = true)
	public Optional<MemberResponse> findMember(UUID userId) {
		return users.findById(userId)
			.map(user -> MemberResponse.of(user, interests.findAllWithCategoryByUserId(userId)
				.stream()
				.map(UserInterest::getCategory)
				.map(category -> category.getCode())
				.toList()));
	}

	@Transactional(readOnly = true)
	public boolean isUsernameAvailable(String username) {
		return !users.existsByUsernameIgnoreCase(username);
	}

}

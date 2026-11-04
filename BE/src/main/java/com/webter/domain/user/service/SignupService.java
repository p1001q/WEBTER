package com.webter.domain.user.service;

import com.webter.domain.category.entity.Category;
import com.webter.domain.category.service.CategoryService;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.policy.service.PolicyService;
import com.webter.domain.user.dto.ConsentRequest;
import com.webter.domain.user.dto.SignupRequest;
import com.webter.domain.user.entity.OAuthIdentity;
import com.webter.domain.user.entity.OAuthProvider;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserConsent;
import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.domain.user.repository.OAuthIdentityRepository;
import com.webter.domain.user.repository.UserConsentRepository;
import com.webter.domain.user.repository.UserInterestRepository;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.exception.BusinessException;
import com.webter.global.security.SessionPrincipal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 온보딩 최종 제출 처리. 회원·구글 계정 연결·동의 이력·관심 카테고리를 한 트랜잭션으로 저장하고,
 * 하나라도 실패하면 아무것도 저장하지 않는다(정책서 2.1 가입 완료 처리).
 */
@Service
@RequiredArgsConstructor
public class SignupService {

	/** 가입 때 반드시 동의받는 문서. SERVICE_REGISTRATION은 서비스 등록 때 받는다. */
	private static final List<DocumentType> REQUIRED = List.of(DocumentType.TERMS, DocumentType.PRIVACY,
			DocumentType.AGE_CONFIRMATION);

	private final UserRepository users;

	private final OAuthIdentityRepository identities;

	private final UserConsentRepository consents;

	private final UserInterestRepository interests;

	private final CategoryService categories;

	private final PolicyService policies;

	@Transactional
	public User signup(SessionPrincipal.PendingSignup pending, SignupRequest request) {
		List<PolicyDocument> agreed = validateConsents(request.consents());
		List<Category> selected = categories.resolveActive(request.interests());
		if (users.existsByUsernameIgnoreCase(request.username())) {
			throw new BusinessException(UserErrorCode.USERNAME_DUPLICATED);
		}
		if (identities.findByProviderAndProviderSubject(OAuthProvider.GOOGLE, pending.googleSubject()).isPresent()) {
			throw new BusinessException(UserErrorCode.ALREADY_REGISTERED);
		}
		try {
			User user = users.saveAndFlush(User.builder()
				.username(request.username())
				.nickname(request.nickname())
				.email(pending.email())
				.build());
			identities.saveAndFlush(OAuthIdentity.builder().user(user).providerSubject(pending.googleSubject()).build());
			agreed.forEach(document -> consents.save(UserConsent.builder().user(user).policyDocument(document).build()));
			short order = 1;
			for (Category category : selected) {
				interests.save(UserInterest.builder().user(user).category(category).sortOrder(order++).build());
			}
			interests.flush();
			return user;
		}
		catch (DataIntegrityViolationException e) {
			// 사전 확인과 저장 사이에 같은 아이디·계정이 먼저 저장된 경우(동시 제출)
			String detail = String.valueOf(e.getMostSpecificCause().getMessage());
			if (detail.contains("ux_users_username_ci")) {
				throw new BusinessException(UserErrorCode.USERNAME_DUPLICATED);
			}
			if (detail.contains("oauth_identities")) {
				throw new BusinessException(UserErrorCode.ALREADY_REGISTERED);
			}
			throw e;
		}
	}

	// 필수 3종이 각각 한 번씩, 현재 버전으로 들어왔는지 확인한다
	private List<PolicyDocument> validateConsents(List<ConsentRequest> requested) {
		Map<DocumentType, String> versions = new EnumMap<>(DocumentType.class);
		for (ConsentRequest consent : requested) {
			if (!REQUIRED.contains(consent.documentType()) || versions.put(consent.documentType(), consent.version()) != null) {
				throw new BusinessException(UserErrorCode.CONSENT_REQUIRED);
			}
		}
		if (!versions.keySet().containsAll(REQUIRED)) {
			throw new BusinessException(UserErrorCode.CONSENT_REQUIRED);
		}
		return REQUIRED.stream().map(type -> {
			PolicyDocument current = policies.current(type)
				.orElseThrow(() -> new BusinessException(UserErrorCode.CONSENT_REQUIRED));
			if (!current.getVersion().equals(versions.get(type))) {
				throw new BusinessException(UserErrorCode.POLICY_VERSION_CHANGED);
			}
			return current;
		}).toList();
	}

}

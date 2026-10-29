package com.webter.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.IntegrationTest;
import com.webter.domain.category.entity.Category;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.OAuthIdentity;
import com.webter.domain.user.entity.OAuthProvider;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.entity.UserConsent;
import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.entity.UserInterestId;
import com.webter.domain.user.entity.UserRole;
import com.webter.domain.user.repository.OAuthIdentityRepository;
import com.webter.domain.user.repository.UserConsentRepository;
import com.webter.domain.user.repository.UserInterestRepository;
import com.webter.domain.user.repository.UserRepository;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

// 가입 기반 엔티티가 V1 스키마와 맞는지(컨텍스트 시작 시 validate), 저장·조회가 되는지 확인한다
@Transactional
class SignupEntitiesTests extends IntegrationTest {

	@Autowired
	EntityManager em;

	@Autowired
	UserRepository userRepository;

	@Autowired
	OAuthIdentityRepository oauthIdentityRepository;

	@Autowired
	CategoryRepository categoryRepository;

	@Autowired
	PolicyDocumentRepository policyDocumentRepository;

	@Autowired
	UserConsentRepository userConsentRepository;

	@Autowired
	UserInterestRepository userInterestRepository;

	@Test
	void savesAndReadsSignupData() {
		Category category = categoryRepository.save(
				Category.builder().code("TEST_WEB").name("테스트 웹").sortOrder((short) 9001).build());
		PolicyDocument terms = policyDocumentRepository.save(PolicyDocument.builder()
			.documentType(DocumentType.TERMS)
			.version("1")
			.title("이용약관")
			.content("본문")
			.build());
		User user = userRepository.save(User.builder()
			.username("alice")
			.nickname("앨리스")
			.profileLinks(Map.of("github", "https://github.com/alice"))
			.build());
		oauthIdentityRepository.save(OAuthIdentity.builder().user(user).providerSubject("google-sub-1").build());
		userConsentRepository.save(UserConsent.builder().user(user).policyDocument(terms).build());
		userInterestRepository.save(UserInterest.builder().user(user).category(category).sortOrder((short) 1).build());
		em.flush();
		em.clear();

		User found = userRepository.findById(user.getId()).orElseThrow();
		assertThat(found.getRole()).isEqualTo(UserRole.USER);
		assertThat(found.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
		assertThat(found.getVisibilityStatus()).isEqualTo(VisibilityStatus.PUBLIC);
		assertThat(found.getProfileLinks()).containsEntry("github", "https://github.com/alice");
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(found.getUpdatedAt()).isNotNull();

		assertThat(oauthIdentityRepository.findByProviderAndProviderSubject(OAuthProvider.GOOGLE, "google-sub-1"))
			.isPresent();
		assertThat(policyDocumentRepository.findByDocumentTypeAndVersion(DocumentType.TERMS, "1")).isPresent();
		assertThat(categoryRepository.findByActiveTrueOrderBySortOrderAsc()).extracting(Category::getCode)
			.contains("TEST_WEB");
		UserInterest interest = userInterestRepository
			.findById(new UserInterestId(user.getId(), category.getId()))
			.orElseThrow();
		assertThat(interest.getSortOrder()).isEqualTo((short) 1);
	}

	@Test
	void usernameIsUniqueIgnoringCase() {
		userRepository.saveAndFlush(User.builder().username("alice").nickname("앨리스").build());

		assertThat(userRepository.existsByUsernameIgnoreCase("ALICE")).isTrue();
		assertThatThrownBy(() -> userRepository.saveAndFlush(User.builder().username("ALICE").nickname("다른").build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void sameGoogleAccountCannotLinkToTwoUsers() {
		User first = userRepository.save(User.builder().username("first").nickname("첫째").build());
		User second = userRepository.save(User.builder().username("second").nickname("둘째").build());
		oauthIdentityRepository.saveAndFlush(
				OAuthIdentity.builder().user(first).providerSubject("same-sub").build());

		assertThatThrownBy(() -> oauthIdentityRepository
			.saveAndFlush(OAuthIdentity.builder().user(second).providerSubject("same-sub").build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

}

package com.webter.domain.webservice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.IntegrationTest;
import com.webter.domain.category.entity.Category;
import com.webter.domain.category.entity.Tag;
import com.webter.domain.category.repository.CategoryRepository;
import com.webter.domain.category.repository.TagRepository;
import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.repository.UserRepository;
import com.webter.domain.webservice.entity.AvailabilityStatus;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.LanguageCode;
import com.webter.domain.webservice.entity.PreviewFit;
import com.webter.domain.webservice.entity.PreviewRatio;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import com.webter.domain.webservice.entity.RegistrantType;
import com.webter.domain.webservice.entity.ServiceCategory;
import com.webter.domain.webservice.entity.ServiceCategoryId;
import com.webter.domain.webservice.entity.ServiceTag;
import com.webter.domain.webservice.entity.ServiceTagId;
import com.webter.domain.webservice.entity.ServiceVersion;
import com.webter.domain.webservice.entity.WebService;
import com.webter.domain.webservice.repository.ServiceCategoryRepository;
import com.webter.domain.webservice.repository.ServiceTagRepository;
import com.webter.domain.webservice.repository.ServiceVersionRepository;
import com.webter.domain.webservice.repository.WebServiceRepository;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

// 서비스 관련 엔티티가 V1 스키마와 맞는지(컨텍스트 시작 시 validate), 저장·조회와 주요 제약이 동작하는지 확인한다
@Transactional
class WebServiceEntitiesTests extends IntegrationTest {

	@Autowired
	EntityManager em;

	@Autowired
	UserRepository userRepository;

	@Autowired
	CategoryRepository categoryRepository;

	@Autowired
	TagRepository tagRepository;

	@Autowired
	PolicyDocumentRepository policyDocumentRepository;

	@Autowired
	WebServiceRepository webServiceRepository;

	@Autowired
	ServiceCategoryRepository serviceCategoryRepository;

	@Autowired
	ServiceTagRepository serviceTagRepository;

	@Autowired
	ServiceVersionRepository serviceVersionRepository;

	@Test
	void savesServiceWithCategoriesTagsAndVersion() {
		User owner = owner();
		WebService service = webServiceRepository.save(service(owner, "https://example.com/a").build());
		List<Category> categories = categoryRepository.findByActiveTrueOrderBySortOrderAsc();
		Tag tag = tagRepository.save(Tag.builder().name("퍼즐").normalizedName("퍼즐").build());
		serviceCategoryRepository.save(
				ServiceCategory.builder().webService(service).category(categories.get(0)).sortOrder((short) 1).build());
		serviceCategoryRepository.save(
				ServiceCategory.builder().webService(service).category(categories.get(1)).sortOrder((short) 2).build());
		serviceTagRepository.save(ServiceTag.builder().webService(service).tag(tag).sortOrder((short) 1).build());
		serviceVersionRepository.save(ServiceVersion.builder()
			.webService(service)
			.version("1.0.0")
			.title("첫 출시")
			.content("처음 공개합니다.")
			.build());
		em.flush();
		em.clear();

		WebService found = webServiceRepository.findById(service.getId()).orElseThrow();
		assertThat(found.getAvailabilityStatus()).isEqualTo(AvailabilityStatus.AVAILABLE);
		assertThat(found.getVisibilityStatus()).isEqualTo(VisibilityStatus.PUBLIC);
		assertThat(found.getPreviewRatio()).isEqualTo(PreviewRatio.LANDSCAPE);
		assertThat(found.getPreviewFit()).isEqualTo(PreviewFit.COVER);
		assertThat(found.isAllowGuestReviews()).isFalse();
		assertThat(found.getDeviceCodes()).containsExactly(DeviceCode.PC, DeviceCode.MOBILE);
		assertThat(found.getLanguageCodes()).containsExactly(LanguageCode.KO);
		assertThat(found.getPreviewImages()).isEmpty();
		assertThat(found.getRegistrationPolicy().getDocumentType()).isEqualTo(DocumentType.SERVICE_REGISTRATION);
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(found.getUpdatedAt()).isNotNull();

		ServiceCategory primary = serviceCategoryRepository
			.findById(new ServiceCategoryId(service.getId(), categories.get(0).getId()))
			.orElseThrow();
		assertThat(primary.getSortOrder()).isEqualTo((short) 1);
		assertThat(serviceTagRepository.findById(new ServiceTagId(service.getId(), tag.getId()))).isPresent();
		assertThat(serviceVersionRepository.findByWebServiceOrderByCreatedAtDesc(found))
			.extracting(ServiceVersion::getVersion)
			.containsExactly("1.0.0");
	}

	@Test
	void previewRatioIsStoredAsRatioText() {
		WebService service = webServiceRepository
			.save(service(owner(), "https://example.com/portrait").previewRatio(PreviewRatio.PORTRAIT).build());
		em.flush();
		em.clear();

		assertThat(webServiceRepository.findById(service.getId()).orElseThrow().getPreviewRatio())
			.isEqualTo(PreviewRatio.PORTRAIT);
		Object stored = em.createNativeQuery("SELECT preview_ratio FROM services WHERE service_id = :id")
			.setParameter("id", service.getId())
			.getSingleResult();
		assertThat(stored).isEqualTo("9:16");
	}

	@Test
	void sameCanonicalUrlCannotBeRegisteredTwice() {
		User owner = owner();
		webServiceRepository.saveAndFlush(service(owner, "https://example.com/dup").build());

		assertThat(webServiceRepository.existsByCanonicalUrl("https://example.com/dup")).isTrue();
		assertThatThrownBy(() -> webServiceRepository
			.saveAndFlush(service(owner, "https://example.com/dup").build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void teamServiceRequiresTeamName() {
		assertThatThrownBy(() -> webServiceRepository.saveAndFlush(service(owner(), "https://example.com/team")
			.registrantType(RegistrantType.TEAM)
			.build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void serviceCategoryAllowsOnlyThreeSlots() {
		WebService service = webServiceRepository.save(service(owner(), "https://example.com/slots").build());
		Category category = categoryRepository.findByActiveTrueOrderBySortOrderAsc().get(0);

		assertThatThrownBy(() -> serviceCategoryRepository.saveAndFlush(
				ServiceCategory.builder().webService(service).category(category).sortOrder((short) 4).build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void tagNormalizedNameIsUnique() {
		tagRepository.saveAndFlush(Tag.builder().name("Puzzle").normalizedName("puzzle").build());

		assertThat(tagRepository.findByNormalizedName("puzzle")).isPresent();
		assertThatThrownBy(() -> tagRepository
			.saveAndFlush(Tag.builder().name("PUZZLE").normalizedName("puzzle").build()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private User owner() {
		return userRepository.save(User.builder().username("owner").nickname("등록자").build());
	}

	// 기본 값을 채운 서비스 빌더. 테스트마다 필요한 값만 덮어쓴다
	private WebService.WebServiceBuilder service(User owner, String url) {
		PolicyDocument policy = policyDocumentRepository
			.findByDocumentTypeAndVersion(DocumentType.SERVICE_REGISTRATION, "draft-1")
			.orElseThrow();
		return WebService.builder()
			.owner(owner)
			.name("테스트 서비스")
			.tagline("한 줄 소개")
			.serviceUrl(url)
			.canonicalUrl(url)
			.projectType(ProjectType.SIDE)
			.priceType(PriceType.FREE)
			.registrantType(RegistrantType.INDIVIDUAL)
			.registrationPolicy(policy)
			.deviceCodes(List.of(DeviceCode.PC, DeviceCode.MOBILE));
	}

}

package com.webter;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.user.repository.UserRepository;
import com.webter.domain.webservice.entity.DeviceCode;
import com.webter.domain.webservice.entity.PriceType;
import com.webter.domain.webservice.entity.ProjectType;
import com.webter.domain.webservice.entity.RegistrantType;
import com.webter.domain.webservice.entity.WebService;
import com.webter.domain.webservice.repository.WebServiceRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

/** 회원·서비스가 필요한 엔티티 테스트의 공통 준비. 테스트마다 롤백되므로 데이터가 남지 않는다. */
@Transactional
public abstract class DomainFixtureTest extends IntegrationTest {

	@Autowired
	protected EntityManager em;

	@Autowired
	protected UserRepository userRepository;

	@Autowired
	protected WebServiceRepository webServiceRepository;

	@Autowired
	protected PolicyDocumentRepository policyDocumentRepository;

	protected User createUser(String username) {
		return userRepository.save(User.builder().username(username).nickname("닉네임_" + username).build());
	}

	// 시드 데이터(V2)의 서비스 등록 확인 문구를 사용한다
	protected WebService createService(User owner, String url) {
		return webServiceRepository.save(WebService.builder()
			.owner(owner)
			.name("테스트 서비스")
			.tagline("한 줄 소개")
			.serviceUrl(url)
			.canonicalUrl(url)
			.projectType(ProjectType.SIDE)
			.priceType(PriceType.FREE)
			.registrantType(RegistrantType.INDIVIDUAL)
			.registrationPolicy(policyDocumentRepository
				.findByDocumentTypeAndVersion(DocumentType.SERVICE_REGISTRATION, "draft-1")
				.orElseThrow())
			.deviceCodes(List.of(DeviceCode.PC))
			.build());
	}

	protected void flushAndClear() {
		em.flush();
		em.clear();
	}

}

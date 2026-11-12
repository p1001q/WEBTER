package com.webter.domain.policy.repository;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyDocumentRepository extends JpaRepository<PolicyDocument, Long> {

	Optional<PolicyDocument> findByDocumentTypeAndVersion(DocumentType documentType, String version);

	// 같은 종류에서 가장 나중에 등록된 문서가 현재 버전이다
	Optional<PolicyDocument> findFirstByDocumentTypeOrderByIdDesc(DocumentType documentType);

}

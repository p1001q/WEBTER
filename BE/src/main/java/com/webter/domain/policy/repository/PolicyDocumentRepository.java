package com.webter.domain.policy.repository;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyDocumentRepository extends JpaRepository<PolicyDocument, Long> {

	Optional<PolicyDocument> findByDocumentTypeAndVersion(DocumentType documentType, String version);

}

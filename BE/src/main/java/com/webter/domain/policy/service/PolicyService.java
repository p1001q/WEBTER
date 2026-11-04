package com.webter.domain.policy.service;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import com.webter.domain.policy.repository.PolicyDocumentRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PolicyService {

	private final PolicyDocumentRepository policyDocuments;

	@Transactional(readOnly = true)
	public Optional<PolicyDocument> current(DocumentType type) {
		return policyDocuments.findFirstByDocumentTypeOrderByIdDesc(type);
	}

	@Transactional(readOnly = true)
	public List<PolicyDocument> currentAll() {
		return Arrays.stream(DocumentType.values()).map(this::current).flatMap(Optional::stream).toList();
	}

}

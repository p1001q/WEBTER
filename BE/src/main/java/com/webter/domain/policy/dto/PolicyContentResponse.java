package com.webter.domain.policy.dto;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;
import java.time.Instant;

/** 현재 적용 중인 문서의 원문(마크다운). 약관·개인정보처리방침 화면이 표시한다. */
public record PolicyContentResponse(DocumentType documentType, String version, String title, String content,
		Instant effectiveAt) {

	public static PolicyContentResponse of(PolicyDocument document) {
		return new PolicyContentResponse(document.getDocumentType(), document.getVersion(), document.getTitle(),
				document.getContent(), document.getEffectiveAt());
	}

}

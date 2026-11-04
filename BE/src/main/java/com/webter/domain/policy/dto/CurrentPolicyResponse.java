package com.webter.domain.policy.dto;

import com.webter.domain.policy.entity.DocumentType;
import com.webter.domain.policy.entity.PolicyDocument;

/** 현재 적용 중인 문서의 종류와 버전. 가입 요청에 이 버전을 담아 보낸다. */
public record CurrentPolicyResponse(DocumentType documentType, String version, String title) {

	public static CurrentPolicyResponse of(PolicyDocument document) {
		return new CurrentPolicyResponse(document.getDocumentType(), document.getVersion(), document.getTitle());
	}

}

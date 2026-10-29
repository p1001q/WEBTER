package com.webter.domain.policy.entity;

import com.webter.global.entity.BaseCreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 약관·확인 문구의 버전별 원문. 동의 기록은 어느 버전에 동의했는지를 이 테이블로 가리킨다. */
@Getter
@Entity
@Table(name = "policy_documents")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PolicyDocument extends BaseCreatedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "policy_document_id")
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "document_type", nullable = false, length = 30)
	private DocumentType documentType;

	@Column(nullable = false, length = 50)
	private String version;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false)
	private String content;

	@Column(name = "effective_at")
	private Instant effectiveAt;

	@Builder
	private PolicyDocument(DocumentType documentType, String version, String title, String content,
			Instant effectiveAt) {
		this.documentType = documentType;
		this.version = version;
		this.title = title;
		this.content = content;
		this.effectiveAt = effectiveAt;
	}

}

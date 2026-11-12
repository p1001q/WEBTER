package com.webter.domain.webservice.entity;

import com.webter.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 등록자가 남기는 서비스 업데이트(버전) 기록 */
@Getter
@Entity
@Table(name = "service_versions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceVersion extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "service_version_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private WebService webService;

	@Column(nullable = false)
	private String version;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false)
	private String content;

	@Builder
	private ServiceVersion(WebService webService, String version, String title, String content) {
		this.webService = webService;
		this.version = version;
		this.title = title;
		this.content = content;
	}

}

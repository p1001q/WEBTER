package com.webter.domain.webservice.entity;

import com.webter.domain.category.entity.Tag;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 서비스에 붙은 태그(최대 5개) */
@Getter
@Entity
@Table(name = "service_tags")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceTag {

	@EmbeddedId
	private ServiceTagId id = new ServiceTagId();

	@MapsId("serviceId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id")
	private WebService webService;

	@MapsId("tagId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "tag_id")
	private Tag tag;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder;

	@Builder
	private ServiceTag(WebService webService, Tag tag, short sortOrder) {
		this.webService = webService;
		this.tag = tag;
		this.sortOrder = sortOrder;
	}

}

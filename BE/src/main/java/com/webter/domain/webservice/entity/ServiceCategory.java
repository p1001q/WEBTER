package com.webter.domain.webservice.entity;

import com.webter.domain.category.entity.Category;
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

/** 서비스가 선택한 용도 카테고리(최대 3개). 선택 순서 1이 대표 카테고리다. */
@Getter
@Entity
@Table(name = "service_categories")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceCategory {

	@EmbeddedId
	private ServiceCategoryId id = new ServiceCategoryId();

	@MapsId("serviceId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id")
	private WebService webService;

	@MapsId("categoryId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id")
	private Category category;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder;

	@Builder
	private ServiceCategory(WebService webService, Category category, short sortOrder) {
		this.webService = webService;
		this.category = category;
		this.sortOrder = sortOrder;
	}

}

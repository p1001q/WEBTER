package com.webter.domain.category.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 서비스 용도 카테고리 */
@Getter
@Entity
@Table(name = "categories")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "category_id")
	private Long id;

	@Column(nullable = false, length = 30)
	private String code;

	@Column(nullable = false, length = 30)
	private String name;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder;

	@Column(name = "default_icon_url")
	private String defaultIconUrl;

	@Column(name = "default_thumbnail_url")
	private String defaultThumbnailUrl;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@Builder
	private Category(String code, String name, short sortOrder, String defaultIconUrl, String defaultThumbnailUrl) {
		this.code = code;
		this.name = name;
		this.sortOrder = sortOrder;
		this.defaultIconUrl = defaultIconUrl;
		this.defaultThumbnailUrl = defaultThumbnailUrl;
	}

}

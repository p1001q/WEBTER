package com.webter.domain.user.entity;

import com.webter.domain.category.entity.Category;
import com.webter.global.entity.BaseCreatedEntity;
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

/** 회원이 고른 관심 카테고리(최대 3개, 선택 순서 1~3) */
@Getter
@Entity
@Table(name = "user_interests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserInterest extends BaseCreatedEntity {

	@EmbeddedId
	private UserInterestId id = new UserInterestId();

	@MapsId("userId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	@MapsId("categoryId")
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id")
	private Category category;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder;

	@Builder
	private UserInterest(User user, Category category, short sortOrder) {
		this.user = user;
		this.category = category;
		this.sortOrder = sortOrder;
	}

}

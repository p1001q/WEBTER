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

/** 자유 입력 태그. normalizedName(공백·대소문자를 정리한 값)이 같으면 같은 태그로 본다. */
@Getter
@Entity
@Table(name = "tags")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "tag_id")
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column(name = "normalized_name", nullable = false)
	private String normalizedName;

	@Builder
	private Tag(String name, String normalizedName) {
		this.name = name;
		this.normalizedName = normalizedName;
	}

}

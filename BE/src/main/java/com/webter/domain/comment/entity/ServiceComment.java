package com.webter.domain.comment.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.BaseTimeEntity;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서비스의 자유 댓글과 답글. 평가나 투표는 없다.
 * 답글(parent가 있는 댓글)의 부모는 같은 서비스의 댓글이어야 하며 DB가 이를 강제한다.
 */
@Getter
@Entity
@Table(name = "service_comments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceComment extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "comment_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private WebService webService;

	// DB에서는 (service_id, parent_comment_id) 복합 FK로 같은 서비스인지까지 확인한다
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_comment_id")
	private ServiceComment parent;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "author_id")
	private User author;

	@Column(nullable = false, length = 500)
	private String content;

	@Column(name = "is_anonymous", nullable = false)
	private boolean anonymous = false;

	@Enumerated(EnumType.STRING)
	@Column(name = "visibility_status", nullable = false, length = 20)
	private VisibilityStatus visibilityStatus = VisibilityStatus.PUBLIC;

	@Column(name = "hidden_reason")
	private String hiddenReason;

	// 작성자가 삭제한 시각. 답글이 달려 있어도 구조를 유지하려고 행은 지우지 않는다.
	@Column(name = "deleted_at")
	private Instant deletedAt;

	@Builder
	private ServiceComment(WebService webService, ServiceComment parent, User author, String content,
			boolean anonymous) {
		this.webService = webService;
		this.parent = parent;
		this.author = author;
		this.content = content;
		this.anonymous = anonymous;
	}

	public void delete() {
		this.deletedAt = Instant.now();
	}

}

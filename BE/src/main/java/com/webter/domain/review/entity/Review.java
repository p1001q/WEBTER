package com.webter.domain.review.entity;

import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.BaseTimeEntity;
import com.webter.global.entity.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서비스 리뷰와 평가. 회원은 서비스당 하나, 비회원은 같은 서비스에 IP 해시당 하나만 쓸 수 있다.
 * 회원이 탈퇴하면 author가 비워지고 "탈퇴한 사용자"로 표시된다.
 */
@Getter
@Entity
@Table(name = "reviews")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "review_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private WebService webService;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "author_id")
	private User author;

	@Enumerated(EnumType.STRING)
	@Column(name = "author_kind", nullable = false, length = 10)
	private AuthorKind authorKind;

	// 비회원 중복 방지용 값(IP를 HMAC으로 변환한 것)과 화면 표시용 일부 IP
	@Column(name = "guest_ip_hmac")
	private String guestIpHmac;

	@Column(name = "guest_ip_display")
	private String guestIpDisplay;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ReviewRating rating = ReviewRating.NONE;

	@Column(nullable = false, length = 500)
	private String content;

	@Column(name = "is_anonymous", nullable = false)
	private boolean anonymous = false;

	@Column(name = "is_creator_review", nullable = false)
	private boolean creatorReview = false;

	@Enumerated(EnumType.STRING)
	@Column(name = "visibility_status", nullable = false, length = 20)
	private VisibilityStatus visibilityStatus = VisibilityStatus.PUBLIC;

	@Column(name = "hidden_reason")
	private String hiddenReason;

	@Embedded
	private ReviewReply reply;

	@Builder
	private Review(WebService webService, User author, AuthorKind authorKind, String guestIpHmac,
			String guestIpDisplay, ReviewRating rating, String content, boolean anonymous, boolean creatorReview) {
		this.webService = webService;
		this.author = author;
		this.authorKind = authorKind;
		this.guestIpHmac = guestIpHmac;
		this.guestIpDisplay = guestIpDisplay;
		if (rating != null) {
			this.rating = rating;
		}
		this.content = content;
		this.anonymous = anonymous;
		this.creatorReview = creatorReview;
	}

	/** 제작자 답글을 단다. 이미 있으면 새 답글로 바꾼다. */
	public void writeReply(User replyAuthor, String replyContent) {
		this.reply = ReviewReply.create(replyAuthor, replyContent);
	}

}

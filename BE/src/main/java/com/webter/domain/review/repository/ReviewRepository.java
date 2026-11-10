package com.webter.domain.review.repository;

import com.webter.domain.review.entity.Review;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ReviewRepository extends JpaRepository<Review, Long> {

	List<Review> findByWebServiceOrderByCreatedAtDesc(WebService webService);

	Optional<Review> findByWebServiceAndAuthor(WebService webService, User author);

	boolean existsByWebServiceAndGuestIpHmac(WebService webService, String guestIpHmac);

	@EntityGraph(attributePaths = "author")
	List<Review> findByIdIn(Collection<Long> ids);

	Optional<Review> findByIdAndWebService(long id, WebService webService);

	Optional<Review> findByWebServiceAndAuthor_Id(WebService webService, UUID authorId);

	// 단독 평가를 같은 ID로 게시한다. 이 시각부터 글의 작성일과 수정 여부를 판단한다.
	@Modifying
	@Query(value = """
			update reviews set content = :text, rating = :rate, is_anonymous = :anon,
				is_creator_review = :creator, created_at = statement_timestamp(), updated_at = statement_timestamp()
			where review_id = :id
			""", nativeQuery = true)
	void publish(long id, String text, String rate, boolean anon, boolean creator);

	// 답글 수정은 리뷰 자체의 수정 시각과 신고 대상 ID를 바꾸지 않는다.
	@Modifying
	@Query(value = """
			update reviews set reply_id = coalesce(reply_id, :replyId),
				reply_author_id = case when reply_id is null then :authorId else reply_author_id end,
				reply_content = :text, reply_visibility_status = 'PUBLIC',
				reply_created_at = coalesce(reply_created_at, statement_timestamp()),
				reply_updated_at = statement_timestamp()
			where review_id = :id and reply_content is distinct from :text
			""", nativeQuery = true)
	void saveReply(long id, UUID replyId, UUID authorId, String text);

	@Modifying
	@Query(value = """
			update reviews set reply_id = null, reply_author_id = null, reply_content = null,
				reply_visibility_status = null, reply_hidden_reason = null, reply_created_at = null, reply_updated_at = null
			where review_id = :id and reply_id is not null
			""", nativeQuery = true)
	void removeReply(long id);

}

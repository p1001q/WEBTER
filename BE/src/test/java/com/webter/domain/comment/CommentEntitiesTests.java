package com.webter.domain.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.DomainFixtureTest;
import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.comment.repository.ServiceCommentRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

// 자유 댓글·답글 엔티티가 V1 스키마와 맞는지, 답글의 부모가 같은 서비스여야 한다는 제약이 동작하는지 확인한다
class CommentEntitiesTests extends DomainFixtureTest {

	@Autowired
	ServiceCommentRepository commentRepository;

	@Test
	void savesCommentWithReplyInOrder() {
		User owner = createUser("owner");
		User writer = createUser("writer");
		WebService service = createService(owner, "https://example.com/comments");
		ServiceComment parent = commentRepository.save(comment(service, null, writer, "첫 댓글"));
		commentRepository.save(comment(service, parent, owner, "답글입니다"));
		flushAndClear();

		List<ServiceComment> comments = commentRepository.findByWebServiceOrderByCreatedAtAsc(service);

		assertThat(comments).extracting(ServiceComment::getContent).containsExactly("첫 댓글", "답글입니다");
		assertThat(comments.get(0).getParent()).isNull();
		assertThat(comments.get(1).getParent().getId()).isEqualTo(parent.getId());
		assertThat(comments.get(0).isAnonymous()).isFalse();
		assertThat(comments.get(0).getCreatedAt()).isNotNull();
	}

	@Test
	void deleteMarksDeletedAtAndKeepsTheRow() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/comment-delete");
		ServiceComment comment = commentRepository.save(comment(service, null, owner, "지울 댓글"));
		comment.delete();
		flushAndClear();

		ServiceComment found = commentRepository.findById(comment.getId()).orElseThrow();

		assertThat(found.getDeletedAt()).isNotNull();
	}

	@Test
	void replyParentMustBelongToTheSameService() {
		User owner = createUser("owner");
		WebService first = createService(owner, "https://example.com/first");
		WebService second = createService(owner, "https://example.com/second");
		ServiceComment parent = commentRepository.saveAndFlush(comment(first, null, owner, "다른 서비스 댓글"));

		assertThatThrownBy(() -> commentRepository.saveAndFlush(comment(second, parent, owner, "잘못된 답글")))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private ServiceComment comment(WebService service, ServiceComment parent, User author, String content) {
		return ServiceComment.builder().webService(service).parent(parent).author(author).content(content).build();
	}

}

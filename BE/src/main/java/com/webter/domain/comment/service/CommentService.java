package com.webter.domain.comment.service;

import static com.webter.domain.reaction.service.InteractionText.requireContent;

import com.webter.domain.comment.dto.CommentInput;
import com.webter.domain.comment.dto.CommentView;
import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.comment.repository.ServiceCommentRepository;
import com.webter.domain.comment.repository.ServiceCommentRepository.ReplyCount;
import com.webter.domain.notification.service.NotificationPublisher;
import com.webter.domain.reaction.dto.CursorPage;
import com.webter.domain.reaction.dto.CursorPage.Position;
import com.webter.domain.reaction.dto.InteractionAuthor;
import com.webter.domain.reaction.exception.InteractionErrorCode;
import com.webter.domain.reaction.service.ServiceInteractionAccess;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

	private final ServiceInteractionAccess access;
	private final ServiceCommentRepository comments;
	private final NotificationPublisher notifications;

	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public CursorPage<CommentView> list(long serviceId, UUID viewerId, Long parentId, String cursor, int limit) {
		var service = access.read(serviceId);
		CursorPage.checkLimit(limit);
		if (parentId != null && findPublic(service, parentId).getParent() != null) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
		String scope = "comment:" + serviceId + ":" + parentId;
		Position after = Position.decode(cursor, scope);
		var rows = comments.findPage(serviceId, parentId, after == null ? Instant.EPOCH : after.date(),
			after == null ? 0 : after.id(), PageRequest.ofSize(limit + 1));
		var page = rows.subList(0, Math.min(rows.size(), limit));
		var counts = parentId == null ? replyCounts(page) : Map.<Long, Long>of();
		boolean canWrite = access.canWrite(viewerId);
		var items = page.stream().map(comment -> view(comment, viewerId, canWrite, counts.getOrDefault(comment.getId(), 0L)))
			.toList();
		var last = page.isEmpty() ? null : page.getLast();
		return new CursorPage<>(items,
			rows.size() > limit ? new Position(last.getCreatedAt(), last.getId(), 0).encode(scope) : null);
	}

	/** 내가 쓴 댓글·답글(최근 순, 공개된 서비스의 삭제하지 않은 글만). 마이페이지에서 서비스를 가리지 않고 모아 본다. */
	@Transactional(readOnly = true)
	public List<CommentView> myComments(UUID viewerId, int limit) {
		CursorPage.checkLimit(limit);
		boolean canWrite = access.canWrite(viewerId);
		return comments.findMine(viewerId, PageRequest.ofSize(limit))
			.stream()
			.map(comment -> view(comment, viewerId, canWrite, 0))
			.toList();
	}

	@Transactional
	public CommentView create(long serviceId, UUID viewerId, CommentInput input) {
		var context = access.write(serviceId, viewerId);
		String text = requireContent(input.text());
		boolean anon = Boolean.TRUE.equals(input.anon());
		if (anon && (context.maker() || !context.service().isAllowAnonymousComments())) {
			throw new BusinessException(InteractionErrorCode.ANONYMOUS_NOT_ALLOWED);
		}
		ServiceComment parent = null;
		if (input.parentId() != null) {
			parent = findPublic(context.service(), parseId(input.parentId()));
			if (parent.getParent() != null || parent.getDeletedAt() != null) {
				throw new BusinessException(InteractionErrorCode.COMMENT_CANNOT_BE_REPLIED_TO);
			}
		}
		ServiceComment comment = comments.save(ServiceComment.builder().webService(context.service())
			.parent(parent).author(context.member()).content(text).anonymous(anon).build());
		if (parent == null) {
			notifications.commentCreated(context.service(), comment.getId(), context.member(), anon);
		}
		else {
			notifications.commentReply(context.service(), comment.getId(), parent.getAuthor(), context.member(), anon);
		}
		return view(comment, viewerId, true, 0);
	}

	@Transactional
	public CommentView update(long serviceId, long commentId, UUID viewerId, CommentInput input) {
		var context = access.write(serviceId, viewerId);
		ServiceComment comment = findEditable(context.service(), commentId, viewerId);
		comment.edit(requireContent(input.text()));
		comments.flush();
		return view(comment, viewerId, true, comment.getParent() == null ? replyCounts(List.of(comment)).getOrDefault(commentId, 0L) : 0);
	}

	@Transactional
	public void delete(long serviceId, long commentId, UUID viewerId) {
		var context = access.write(serviceId, viewerId);
		remove(findEditable(context.service(), commentId, viewerId));
	}

	/** 운영 조치에서 서비스 행을 잠근 상태로 호출한다. */
	public void removeForModeration(long commentId) {
		remove(comments.findById(commentId).orElseThrow());
	}

	private void remove(ServiceComment comment) {
		if (comments.existsByParent(comment)) {
			comment.leaveTombstone();
			return;
		}
		ServiceComment parent = comment.getParent();
		comments.delete(comment);
		if (parent != null && parent.getDeletedAt() != null) {
			comments.flush();
			if (!comments.existsByParent(parent)) {
				comments.delete(parent);
			}
		}
	}

	private ServiceComment findPublic(WebService service, long id) {
		return comments.findByIdAndWebService(id, service).filter(c -> c.getVisibilityStatus() == VisibilityStatus.PUBLIC)
			.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
	}

	private ServiceComment findEditable(WebService service, long id, UUID viewerId) {
		ServiceComment comment = findPublic(service, id);
		if (comment.getDeletedAt() != null) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
		if (!isAuthor(comment, viewerId)) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		return comment;
	}

	private Map<Long, Long> replyCounts(List<ServiceComment> roots) {
		return roots.isEmpty() ? Map.of() : comments.countReplies(roots.stream().map(ServiceComment::getId).toList())
			.stream().collect(Collectors.toMap(ReplyCount::getParentId, ReplyCount::getTotal));
	}

	private static boolean isAuthor(ServiceComment comment, UUID viewerId) {
		return viewerId != null && comment.getAuthor() != null && viewerId.equals(comment.getAuthor().getId());
	}

	private static CommentView view(ServiceComment comment, UUID viewerId, boolean canWrite, long replies) {
		boolean deleted = comment.getDeletedAt() != null;
		boolean mine = !deleted && isAuthor(comment, viewerId);
		String parent = comment.getParent() == null ? null : comment.getParent().getId().toString();
		return new CommentView(comment.getId().toString(), comment.getWebService().getId().toString(), parent,
			deleted ? null : InteractionAuthor.member(comment.getAuthor(), comment.isAnonymous()), comment.getCreatedAt(),
			deleted ? "" : comment.getContent(), !deleted && comment.getUpdatedAt().isAfter(comment.getCreatedAt()),
			deleted, mine, canWrite && mine, canWrite && mine, canWrite && !deleted && parent == null, replies);
	}

	private static long parseId(String value) {
		try {
			long id = Long.parseLong(value);
			if (id > 0) {
				return id;
			}
		}
		catch (NumberFormatException ignored) {
		}
		throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
	}

}

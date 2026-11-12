package com.webter.domain.comment.repository;

import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.webservice.entity.WebService;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceCommentRepository extends JpaRepository<ServiceComment, Long> {

	List<ServiceComment> findByWebServiceOrderByCreatedAtAsc(WebService webService);

	// 내가 쓴 공개 댓글·답글(삭제하지 않은 것). 공개된 서비스의 댓글만 마이페이지에 보인다.
	@Query("""
			select c from ServiceComment c join fetch c.author join fetch c.webService w
			left join fetch c.parent p
			where c.author.id = :authorId and c.visibilityStatus = PUBLIC and c.deletedAt is null
			  and w.visibilityStatus = PUBLIC and (p.id is null or p.visibilityStatus = PUBLIC)
			order by c.createdAt desc, c.id desc
			""")
	List<ServiceComment> findMine(java.util.UUID authorId, Pageable pageable);

	Optional<ServiceComment> findByIdAndWebService(long id, WebService webService);

	boolean existsByParent(ServiceComment parent);

	@Query("""
			select c from ServiceComment c left join fetch c.author
			where c.webService.id = :serviceId and c.visibilityStatus = PUBLIC
			  and ((:parentId is null and c.parent is null) or c.parent.id = :parentId)
			  and (c.deletedAt is null or exists (
				select 1 from ServiceComment reply where reply.parent = c and reply.visibilityStatus = PUBLIC
				  and reply.deletedAt is null
			  ))
			  and (c.createdAt > :afterDate or (c.createdAt = :afterDate and c.id > :afterId))
			order by c.createdAt asc, c.id asc
			""")
	List<ServiceComment> findPage(long serviceId, Long parentId, Instant afterDate, long afterId, Pageable pageable);

	@Query("""
			select c.parent.id as parentId, count(c) as total from ServiceComment c
			where c.parent.id in :parentIds and c.visibilityStatus = PUBLIC and c.deletedAt is null
			group by c.parent.id
			""")
	List<ReplyCount> countReplies(Collection<Long> parentIds);

	interface ReplyCount {

		long getParentId();

		long getTotal();

	}

}

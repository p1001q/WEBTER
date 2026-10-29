package com.webter.domain.comment.repository;

import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCommentRepository extends JpaRepository<ServiceComment, Long> {

	List<ServiceComment> findByWebServiceOrderByCreatedAtAsc(WebService webService);

}

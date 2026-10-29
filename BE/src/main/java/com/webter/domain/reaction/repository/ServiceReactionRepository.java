package com.webter.domain.reaction.repository;

import com.webter.domain.reaction.entity.ReactionType;
import com.webter.domain.reaction.entity.ServiceReaction;
import com.webter.domain.reaction.entity.ServiceReactionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceReactionRepository extends JpaRepository<ServiceReaction, ServiceReactionId> {

	@Query("select count(r) from ServiceReaction r where r.webService.id = :serviceId and r.id.reactionType = :type")
	long countByServiceAndType(@Param("serviceId") Long serviceId, @Param("type") ReactionType type);

}

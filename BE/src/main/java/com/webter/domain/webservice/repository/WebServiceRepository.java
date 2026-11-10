package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.entity.WebService;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WebServiceRepository extends JpaRepository<WebService, Long> {

	boolean existsByCanonicalUrl(String canonicalUrl);

	Optional<WebService> findByCanonicalUrl(String canonicalUrl);

	/** 제작자를 함께 읽는다(목록의 제작자 정보를 위해 서비스마다 조회하지 않도록). */
	@Query("select s from WebService s join fetch s.owner where s.id in :ids")
	List<WebService> findAllWithOwnerByIdIn(@Param("ids") Collection<Long> ids);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select s from WebService s where s.id = :id")
	Optional<WebService> findLockedById(long id);

}

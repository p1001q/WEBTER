package com.webter.domain.user.repository;

import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.entity.UserInterestId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterestId> {

	@Query("select i from UserInterest i join fetch i.category where i.user.id = :userId order by i.sortOrder")
	List<UserInterest> findAllWithCategoryByUserId(@Param("userId") UUID userId);

}

package com.webter.domain.user.repository;

import com.webter.domain.user.entity.UserInterest;
import com.webter.domain.user.entity.UserInterestId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterestId> {

}

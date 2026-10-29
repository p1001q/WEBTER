package com.webter.domain.team.repository;

import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.entity.ServiceMemberId;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceMemberRepository extends JpaRepository<ServiceMember, ServiceMemberId> {

	List<ServiceMember> findByWebService(WebService webService);

	List<ServiceMember> findByUserOrderByJoinedAtDesc(User user);

}

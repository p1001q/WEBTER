package com.webter.domain.team.repository;

import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.entity.ServiceMemberId;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceMemberRepository extends JpaRepository<ServiceMember, ServiceMemberId> {

	List<ServiceMember> findByWebService(WebService webService);

	List<ServiceMember> findByUserOrderByJoinedAtDesc(User user);

	/** 수락한 순서(오래된 순)로 팀원과 회원 정보를 함께 읽는다. 등록자 승계는 맨 앞 팀원이 잇는다. */
	@Query("""
			select m from ServiceMember m join fetch m.user
			where m.webService = :service
			order by m.joinedAt asc, m.user.id asc
			""")
	List<ServiceMember> findOrdered(WebService service);

	long countByWebService(WebService webService);

	/** 내가 팀원으로 참여한 서비스의 id. */
	@Query("select m.webService.id from ServiceMember m where m.user.id = :userId")
	List<Long> findServiceIdsByUserId(UUID userId);

}

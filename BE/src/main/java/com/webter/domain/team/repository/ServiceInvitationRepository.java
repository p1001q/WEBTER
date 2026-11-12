package com.webter.domain.team.repository;

import com.webter.domain.team.entity.InvitationStatus;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceInvitationRepository extends JpaRepository<ServiceInvitation, Long> {

	List<ServiceInvitation> findByInviteeAndStatusOrderByCreatedAtDesc(User invitee, InvitationStatus status);

	boolean existsByWebServiceAndInviteeAndStatus(WebService webService, User invitee, InvitationStatus status);

	@Query("""
			select i from ServiceInvitation i join fetch i.invitee
			where i.webService = :service and i.status = :status
			order by i.createdAt desc, i.id desc
			""")
	List<ServiceInvitation> findWithInvitee(WebService service, InvitationStatus status);

	Optional<ServiceInvitation> findByIdAndWebService_Id(Long id, Long serviceId);

}

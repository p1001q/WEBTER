package com.webter.domain.team.repository;

import com.webter.domain.team.entity.InvitationStatus;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceInvitationRepository extends JpaRepository<ServiceInvitation, Long> {

	List<ServiceInvitation> findByInviteeAndStatusOrderByCreatedAtDesc(User invitee, InvitationStatus status);

	boolean existsByWebServiceAndInviteeAndStatus(WebService webService, User invitee, InvitationStatus status);

}

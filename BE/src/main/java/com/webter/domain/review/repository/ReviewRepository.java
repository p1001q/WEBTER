package com.webter.domain.review.repository;

import com.webter.domain.review.entity.Review;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

	List<Review> findByWebServiceOrderByCreatedAtDesc(WebService webService);

	Optional<Review> findByWebServiceAndAuthor(WebService webService, User author);

	boolean existsByWebServiceAndGuestIpHmac(WebService webService, String guestIpHmac);

}

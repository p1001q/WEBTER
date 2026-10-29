package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.entity.WebService;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebServiceRepository extends JpaRepository<WebService, Long> {

	boolean existsByCanonicalUrl(String canonicalUrl);

}

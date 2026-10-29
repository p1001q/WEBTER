package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.entity.ServiceVersion;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceVersionRepository extends JpaRepository<ServiceVersion, Long> {

	List<ServiceVersion> findByWebServiceOrderByCreatedAtDesc(WebService webService);

}

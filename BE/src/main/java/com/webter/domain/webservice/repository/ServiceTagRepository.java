package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.entity.ServiceTag;
import com.webter.domain.webservice.entity.ServiceTagId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceTagRepository extends JpaRepository<ServiceTag, ServiceTagId> {

}

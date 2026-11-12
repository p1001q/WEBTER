package com.webter.domain.webservice.repository;

import com.webter.domain.webservice.entity.ServiceCategory;
import com.webter.domain.webservice.entity.ServiceCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, ServiceCategoryId> {

}

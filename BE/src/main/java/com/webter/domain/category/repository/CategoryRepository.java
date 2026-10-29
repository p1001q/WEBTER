package com.webter.domain.category.repository;

import com.webter.domain.category.entity.Category;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

	List<Category> findByActiveTrueOrderBySortOrderAsc();

}

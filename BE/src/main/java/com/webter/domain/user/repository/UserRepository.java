package com.webter.domain.user.repository;

import com.webter.domain.user.entity.User;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

	// 아이디는 대소문자를 구분하지 않고 중복을 판정한다(DB의 lower(username) 유일 인덱스와 같은 기준)
	boolean existsByUsernameIgnoreCase(String username);

}

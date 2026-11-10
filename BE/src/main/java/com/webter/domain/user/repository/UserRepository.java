package com.webter.domain.user.repository;

import com.webter.domain.user.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

	// 아이디는 대소문자를 구분하지 않고 중복을 판정한다(DB의 lower(username) 유일 인덱스와 같은 기준)
	boolean existsByUsernameIgnoreCase(String username);

	// 비키 컬럼 변경은 회원을 가리키는 신고 외래키와 충돌하지 않는다.
	@Query(value = "select * from users where user_id = :id for no key update", nativeQuery = true)
	Optional<User> findLockedById(UUID id);

}

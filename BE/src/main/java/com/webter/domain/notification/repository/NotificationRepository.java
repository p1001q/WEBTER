package com.webter.domain.notification.repository;

import com.webter.domain.notification.entity.Notification;
import com.webter.domain.user.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	List<Notification> findByRecipientOrderByCreatedAtDescIdDesc(User recipient);

	long countByRecipientAndReadAtIsNull(User recipient);

}

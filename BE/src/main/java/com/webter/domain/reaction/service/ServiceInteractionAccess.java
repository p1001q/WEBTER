package com.webter.domain.reaction.service;

import com.webter.domain.user.entity.AccountStatus;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import com.webter.global.entity.VisibilityStatus;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import com.webter.global.security.SessionPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ServiceInteractionAccess {

	private final EntityManager em;

	public WebService read(long serviceId) {
		return requirePublic(em.find(WebService.class, serviceId));
	}

	// 같은 서비스의 쓰기를 직렬화한다. 중복 확인, 제한 판정, 댓글 구조 변경은 이 잠금을 잡고 실행한다.
	public WriteAccess write(long serviceId, UUID viewerId) {
		if (viewerId == null) {
			throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
		}
		WebService service = requirePublic(em.find(WebService.class, serviceId, LockModeType.PESSIMISTIC_WRITE));
		User member = em.find(User.class, viewerId);
		if (member == null || member.getOnboardingCompletedAt() == null) {
			throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
		}
		if (member.getAccountStatus() == AccountStatus.SUSPENDED) {
			throw new BusinessException(CommonErrorCode.FORBIDDEN);
		}
		return new WriteAccess(service, member, isMaker(service, viewerId));
	}

	public boolean canWrite(UUID viewerId) {
		User viewer = viewerId == null ? null : em.find(User.class, viewerId);
		return viewer != null && viewer.getOnboardingCompletedAt() != null
			&& viewer.getAccountStatus() != AccountStatus.SUSPENDED;
	}

	public boolean isMaker(WebService service, UUID viewerId) {
		return viewerId != null && (viewerId.equals(service.getOwner().getId())
			|| Boolean.TRUE.equals(em.createNativeQuery("""
					select exists(select 1 from service_members where service_id = :serviceId and user_id = :userId)
					""").setParameter("serviceId", service.getId()).setParameter("userId", viewerId).getSingleResult()));
	}

	public static UUID viewerId(SessionPrincipal.Member member) {
		return member == null ? null : member.userId();
	}

	private static WebService requirePublic(WebService service) {
		if (service == null || service.getVisibilityStatus() != VisibilityStatus.PUBLIC) {
			throw new BusinessException(CommonErrorCode.NOT_FOUND);
		}
		return service;
	}

	public record WriteAccess(WebService service, User member, boolean maker) {
	}

}

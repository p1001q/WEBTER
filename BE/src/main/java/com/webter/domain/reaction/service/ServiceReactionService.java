package com.webter.domain.reaction.service;

import com.webter.domain.reaction.entity.ReactionType;
import com.webter.domain.reaction.entity.ServiceReactionId;
import com.webter.domain.reaction.exception.InteractionErrorCode;
import com.webter.domain.reaction.repository.ServiceReactionRepository;
import com.webter.global.exception.BusinessException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ServiceReactionService {

	private final ServiceInteractionAccess access;
	private final ServiceReactionRepository reactions;

	@Transactional(readOnly = true)
	public State state(long serviceId, UUID viewerId) {
		access.read(serviceId);
		return new State(has(serviceId, viewerId, ReactionType.LIKE), has(serviceId, viewerId, ReactionType.SAVE));
	}

	@Transactional
	public Toggle set(long serviceId, UUID viewerId, ReactionType type, boolean on) {
		var context = access.write(serviceId, viewerId);
		if (context.maker() && on) {
			throw new BusinessException(InteractionErrorCode.OWN_SERVICE);
		}
		if (on) {
			reactions.insertIfAbsent(serviceId, viewerId, type.name());
		}
		else {
			reactions.deleteById(new ServiceReactionId(viewerId, serviceId, type));
		}
		return new Toggle(on);
	}

	private boolean has(long serviceId, UUID viewerId, ReactionType type) {
		return viewerId != null && reactions.existsById(new ServiceReactionId(viewerId, serviceId, type));
	}

	public record State(boolean liked, boolean saved) {
	}

	public record Toggle(boolean on) {
	}

}

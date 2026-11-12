package com.webter.domain.reaction;

import static org.assertj.core.api.Assertions.assertThat;

import com.webter.DomainFixtureTest;
import com.webter.domain.reaction.entity.ReactionType;
import com.webter.domain.reaction.entity.ServiceReaction;
import com.webter.domain.reaction.entity.ServiceReactionId;
import com.webter.domain.reaction.repository.ServiceReactionRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

// 좋아요·저장 엔티티가 V1 스키마와 맞는지, 종류별 집계와 취소(삭제)가 동작하는지 확인한다
class ReactionEntitiesTests extends DomainFixtureTest {

	@Autowired
	ServiceReactionRepository reactionRepository;

	@Test
	void likeAndSaveCoexistAndCountSeparately() {
		User a = createUser("usera");
		User b = createUser("userb");
		WebService service = createService(a, "https://example.com/reactions");
		reactionRepository.save(new ServiceReaction(a, service, ReactionType.LIKE));
		reactionRepository.save(new ServiceReaction(a, service, ReactionType.SAVE));
		reactionRepository.save(new ServiceReaction(b, service, ReactionType.LIKE));
		flushAndClear();

		assertThat(reactionRepository.countByServiceAndType(service.getId(), ReactionType.LIKE)).isEqualTo(2);
		assertThat(reactionRepository.countByServiceAndType(service.getId(), ReactionType.SAVE)).isEqualTo(1);
	}

	@Test
	void readsBackWithCreatedAt() {
		User user = createUser("reader");
		WebService service = createService(user, "https://example.com/read");
		reactionRepository.save(new ServiceReaction(user, service, ReactionType.LIKE));
		flushAndClear();

		ServiceReaction found = reactionRepository
			.findById(new ServiceReactionId(user.getId(), service.getId(), ReactionType.LIKE))
			.orElseThrow();

		assertThat(found.getReactionType()).isEqualTo(ReactionType.LIKE);
		assertThat(found.getCreatedAt()).isNotNull();
	}

	@Test
	void cancelDeletesTheRow() {
		User user = createUser("canceller");
		WebService service = createService(user, "https://example.com/cancel");
		reactionRepository.save(new ServiceReaction(user, service, ReactionType.LIKE));
		flushAndClear();

		reactionRepository.deleteById(new ServiceReactionId(user.getId(), service.getId(), ReactionType.LIKE));
		flushAndClear();

		assertThat(reactionRepository.countByServiceAndType(service.getId(), ReactionType.LIKE)).isZero();
	}

}

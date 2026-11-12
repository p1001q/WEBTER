package com.webter.domain.stats.service;

import com.webter.domain.reaction.service.ServiceInteractionAccess;
import com.webter.domain.stats.entity.EventType;
import com.webter.domain.stats.entity.ServiceEvent;
import com.webter.domain.stats.repository.LaunchWindowRepository;
import com.webter.domain.stats.repository.LaunchWindowRepository.Key;
import com.webter.domain.stats.repository.ServiceCountBlockRepository;
import com.webter.domain.stats.repository.ServiceEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ServiceEventService {

	private final ServiceInteractionAccess access;
	private final ClientIpHmac ipHmac;
	private final ServiceEventRepository events;
	private final ServiceCountBlockRepository blocks;
	private final LaunchWindowRepository windows;

	@Transactional
	public void record(long serviceId, UUID viewerId, EventType type, String remoteAddress) {
		var context = access.write(serviceId, viewerId);
		Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
		String ipKey = ipHmac.hash(remoteAddress);
		String actorKey = "user:" + viewerId;
		String reason = null;
		if (context.maker()) {
			reason = "SELF";
		}
		else if (type == EventType.LAUNCH) {
			// 회원과 IP는 별도 주체다. 한쪽이 제한 중이어도 다른 쪽의 기준 도달은 따로 판단한다.
			boolean actorBlocked = blocked(serviceId, Key.ACTOR, actorKey, actorKey, now);
			boolean ipBlocked = blocked(serviceId, Key.IP, ipKey, "ip:" + ipKey, now);
			if (actorBlocked || ipBlocked) {
				reason = "LAUNCH_RATE_LIMIT";
			}
		}
		events.save(ServiceEvent.record(context.service(), context.member(), actorKey, ipKey, type, now, reason));
	}

	private boolean blocked(long serviceId, Key key, String value, String blockKey, Instant now) {
		if (blocks.isBlocked(serviceId, blockKey, now)) {
			return true;
		}
		if (!windows.reachesLimit(serviceId, key, value, now)) {
			return false;
		}
		windows.block(serviceId, blockKey, now);
		return true;
	}

}

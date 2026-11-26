package com.webter.domain.user.dto;

import java.time.Instant;

/**
 * 내가 저장한 서비스. 저장한 시각 순서(먼저 저장한 것이 앞)로 내려 준다.
 * 저장한 뒤 비공개된 서비스는 공개 목록에 없으므로, 마이페이지에서 이름과 상태만 보여 주고 저장을 해제할 수 있게
 * 이름(name)과 공개 상태(visibility: PUBLIC·TEMP_HIDDEN·HIDDEN)를 함께 준다. 이미지·사유 같은 다른 정보는 주지 않는다.
 */
public record SavedServiceResponse(String serviceId, Instant savedAt, String name, String visibility) {
}

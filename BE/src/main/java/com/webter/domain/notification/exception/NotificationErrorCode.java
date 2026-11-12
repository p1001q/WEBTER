package com.webter.domain.notification.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum NotificationErrorCode implements ErrorCode {

	PENDING_INVITATION(HttpStatus.CONFLICT, "NOTIFICATION_409_01", "대기 중인 초대 알림은 지울 수 없습니다. 수락하거나 거절해 주세요.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

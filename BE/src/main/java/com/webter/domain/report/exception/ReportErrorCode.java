package com.webter.domain.report.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ReportErrorCode implements ErrorCode {
	INVALID_REASON(HttpStatus.BAD_REQUEST, "REPORT_400_01", "이 대상에 사용할 수 있는 신고 사유를 선택해 주세요."),
	DETAIL_REQUIRED(HttpStatus.BAD_REQUEST, "REPORT_400_02", "기타 신고 사유를 입력해 주세요."),
	ALREADY_REPORTED(HttpStatus.CONFLICT, "REPORT_409_01", "이미 신고한 대상이에요."),
	ACTION_NOT_AVAILABLE(HttpStatus.CONFLICT, "REPORT_409_02", "현재 상태에서 이 조치를 적용할 수 없어요."),
	ADMIN_SANCTION_NOT_AVAILABLE(HttpStatus.FORBIDDEN, "REPORT_403_01", "관리자 계정은 여기에서 제재할 수 없어요.");

	private final HttpStatus status;
	private final String code;
	private final String message;
}

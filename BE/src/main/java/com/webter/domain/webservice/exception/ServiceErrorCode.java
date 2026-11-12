package com.webter.domain.webservice.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ServiceErrorCode implements ErrorCode {

	SERVICE_NOT_FOUND(HttpStatus.NOT_FOUND, "SERVICE_404_01", "서비스를 찾을 수 없습니다."),
	INVALID_SORT(HttpStatus.BAD_REQUEST, "SERVICE_400_01", "정렬 조건이 올바르지 않습니다. 관련도순은 검색어가 필요합니다."),
	INVALID_SERVICE_URL(HttpStatus.BAD_REQUEST, "SERVICE_400_02", "서비스 주소가 올바르지 않습니다. https 주소만 등록할 수 있습니다."),
	SOURCE_HOST_URL(HttpStatus.BAD_REQUEST, "SERVICE_400_03", "배포된 주소를 입력해 주세요. 소스 저장소 주소는 GitHub 링크 칸에 입력할 수 있습니다."),
	INVALID_GITHUB_URL(HttpStatus.BAD_REQUEST, "SERVICE_400_04", "GitHub 저장소 주소만 입력할 수 있습니다."),
	INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "SERVICE_400_05", "선택할 수 없는 서비스 용도가 포함되어 있습니다."),
	INVALID_IMAGE_URL(HttpStatus.BAD_REQUEST, "SERVICE_400_06", "이미지 주소가 올바르지 않습니다."),
	INVALID_TAG(HttpStatus.BAD_REQUEST, "SERVICE_400_07", "태그는 최대 5개이며 한 개당 30자까지 입력할 수 있습니다."),
	STOP_REASON_REQUIRED(HttpStatus.BAD_REQUEST, "SERVICE_400_08", "운영 중지 사유를 입력해 주세요."),
	REGISTRATION_AGREEMENT_REQUIRED(HttpStatus.BAD_REQUEST, "SERVICE_400_09", "등록 확인에 동의해 주세요."),
	INVALID_VERSION(HttpStatus.BAD_REQUEST, "SERVICE_400_10", "버전 기록의 버전·제목·내용을 모두 입력해 주세요."),
	NOT_SERVICE_MANAGER(HttpStatus.FORBIDDEN, "SERVICE_403_01", "이 서비스를 관리할 권한이 없습니다."),
	REGISTRATION_RESTRICTED(HttpStatus.FORBIDDEN, "SERVICE_403_02", "서비스를 등록할 수 없는 계정입니다."),
	URL_DUPLICATED(HttpStatus.CONFLICT, "SERVICE_409_01", "이미 등록된 주소입니다. 같은 주소는 중복 등록할 수 없습니다."),
	DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "SERVICE_429_01", "하루에 등록할 수 있는 서비스는 5개까지입니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

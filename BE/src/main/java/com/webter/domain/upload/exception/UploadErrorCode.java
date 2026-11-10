package com.webter.domain.upload.exception;

import com.webter.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum UploadErrorCode implements ErrorCode {

	UPLOAD_UNSUPPORTED_TYPE(HttpStatus.BAD_REQUEST, "UPLOAD_400_01", "JPG, PNG, WebP 이미지만 올릴 수 있습니다."),
	UPLOAD_TOO_LARGE(HttpStatus.BAD_REQUEST, "UPLOAD_400_02", "이미지는 장당 5MB 이하만 올릴 수 있습니다."),
	UPLOAD_NOT_AN_IMAGE(HttpStatus.BAD_REQUEST, "UPLOAD_400_03", "올린 파일이 올바른 이미지가 아닙니다."),
	UPLOAD_NOT_FOUND(HttpStatus.BAD_REQUEST, "UPLOAD_400_04", "올린 이미지를 찾을 수 없습니다. 다시 올려 주세요."),
	UPLOAD_DISABLED(HttpStatus.SERVICE_UNAVAILABLE, "UPLOAD_503_01", "이미지 업로드가 설정되지 않았습니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

}

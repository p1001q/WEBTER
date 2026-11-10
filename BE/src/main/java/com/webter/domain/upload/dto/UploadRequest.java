package com.webter.domain.upload.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 업로드 주소 발급 요청. 파일 크기(byte)와 형식을 미리 알려야 하고, 올릴 때 같은 값을 보내야 한다. */
public record UploadRequest(@NotBlank String contentType, @NotNull Long size) {

}

package com.webter.domain.webservice.dto;

/** 주소 검사 결과. state는 OK(사용 가능), FORMAT(형식 오류), DUPLICATE(중복), UNREACHABLE(접속 불가)이다. */
public record UrlCheckResponse(State state, String message) {

	public enum State {
		OK, FORMAT, DUPLICATE, UNREACHABLE
	}

}

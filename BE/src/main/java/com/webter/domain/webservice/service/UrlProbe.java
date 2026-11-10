package com.webter.domain.webservice.service;

/** 서비스 주소에 실제로 접속할 수 있는지 확인한다. 테스트에서는 외부 접속 없이 대체한다. */
public interface UrlProbe {

	boolean isReachable(String url);

}

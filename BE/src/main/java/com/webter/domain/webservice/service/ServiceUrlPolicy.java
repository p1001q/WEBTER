package com.webter.domain.webservice.service;

import com.webter.domain.webservice.exception.ServiceErrorCode;
import com.webter.global.exception.BusinessException;
import java.net.URI;
import java.util.List;
import java.util.regex.Pattern;

/** 서비스·GitHub·이미지 주소의 형식 규칙(정책서 1장, 4.4). 접속 가능 여부는 여기서 검사하지 않는다. */
final class ServiceUrlPolicy {

	// 소스 보관 사이트는 서비스 주소로 받지 않는다(github.io는 허용)
	private static final List<String> SOURCE_HOSTS = List.of("github.com", "gitlab.com", "bitbucket.org");

	private static final Pattern GITHUB_REPOSITORY = Pattern.compile("^https://github\\.com/[\\w.-]+/[\\w.-]+/?$");

	private static final int MAX_LENGTH = 2000;

	private ServiceUrlPolicy() {
	}

	/** 중복 판정에 쓰는 주소: 앞뒤 공백과 끝의 슬래시를 없애고 소문자로 바꾼다(화면의 중복 검사와 같은 규칙). */
	static String canonical(String url) {
		return url.trim().replaceAll("/+$", "").toLowerCase();
	}

	/** 서비스 주소가 https이고 소스 보관 사이트가 아닌지 확인하고, 공백을 정리한 주소를 돌려준다. */
	static String validateServiceUrl(String raw) {
		String url = raw == null ? "" : raw.trim();
		URI uri = parse(url);
		if (uri == null || !"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
				|| url.length() > MAX_LENGTH) {
			throw new BusinessException(ServiceErrorCode.INVALID_SERVICE_URL);
		}
		String host = uri.getHost().toLowerCase().replaceFirst("^www\\.", "");
		if (SOURCE_HOSTS.contains(host)) {
			throw new BusinessException(ServiceErrorCode.SOURCE_HOST_URL);
		}
		return url;
	}

	/** GitHub 링크는 비어 있거나 저장소 주소여야 한다. 비면 null을 돌려준다. */
	static String validateGithubUrl(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String url = raw.trim();
		if (!GITHUB_REPOSITORY.matcher(url).matches()) {
			throw new BusinessException(ServiceErrorCode.INVALID_GITHUB_URL);
		}
		return url;
	}

	/**
	 * 이미지 주소의 기본 형식(http·https 절대 주소)을 확인하고 공백을 정리해 돌려준다. 비면 null이다.
	 * 이 서버가 올린 이미지인지는 {@code ImageVerifier}가 따로 확인한다.
	 */
	static String validateImageUrl(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String url = raw.trim();
		URI uri = parse(url);
		boolean absolute = uri != null && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
				&& uri.getHost() != null && uri.getRawUserInfo() == null;
		if (url.length() > MAX_LENGTH || !absolute) {
			throw new BusinessException(ServiceErrorCode.INVALID_IMAGE_URL);
		}
		return url;
	}

	private static URI parse(String url) {
		try {
			return URI.create(url);
		}
		catch (IllegalArgumentException ex) {
			return null;
		}
	}

}

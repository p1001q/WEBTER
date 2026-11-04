package com.webter.domain.user.service;

import com.webter.domain.user.dto.LinkRequest;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.global.exception.BusinessException;
import java.net.IDN;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 프로필 외부 링크 검증·정리. 주소는 http(s)만 허용하고 스킴이 없으면 https를 붙인다. */
final class ProfileLinks {

	private static final Pattern HAS_SCHEME = Pattern.compile("^[a-zA-Z][a-zA-Z0-9+.-]*://.*");

	/** 스킴, 호스트(와 포트), 나머지. 한글 도메인은 URI가 호스트로 읽지 못해 검증용으로만 ASCII로 바꾼다. */
	private static final Pattern AUTHORITY = Pattern.compile("^([a-zA-Z][a-zA-Z0-9+.-]*://)([^/?#]*)(.*)$");

	private ProfileLinks() {
	}

	static Map<String, String> toMap(List<LinkRequest> links) {
		Map<String, String> result = new LinkedHashMap<>();
		if (links == null) {
			return result;
		}
		for (LinkRequest link : links) {
			if (result.put(link.kind(), normalize(link.url())) != null) {
				throw new BusinessException(UserErrorCode.INVALID_LINK);
			}
		}
		return result;
	}

	private static String normalize(String raw) {
		String url = raw.trim();
		if (url.isEmpty() || url.chars().anyMatch(c -> c <= 32 || c == 127)) {
			throw new BusinessException(UserErrorCode.INVALID_LINK);
		}
		if (!HAS_SCHEME.matcher(url).matches()) {
			url = "https://" + url;
		}
		if (url.length() > 300) {
			throw new BusinessException(UserErrorCode.INVALID_LINK);
		}
		try {
			URI uri = URI.create(asciiHost(url));
			boolean web = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
			if (!web || uri.getHost() == null || uri.getRawUserInfo() != null) {
				throw new BusinessException(UserErrorCode.INVALID_LINK);
			}
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(UserErrorCode.INVALID_LINK);
		}
		return url;
	}

	/** 검증용 주소: 호스트만 IDN(punycode)으로 바꾼다. 저장하는 값은 사용자가 입력한 주소 그대로다. */
	private static String asciiHost(String url) {
		Matcher matcher = AUTHORITY.matcher(url);
		if (!matcher.matches()) {
			return url;
		}
		String authority = matcher.group(2);
		if (authority.contains("@") || authority.startsWith("[")) {
			return url;
		}
		int colon = authority.lastIndexOf(':');
		String host = colon < 0 ? authority : authority.substring(0, colon);
		String port = colon < 0 ? "" : authority.substring(colon);
		return matcher.group(1) + IDN.toASCII(host, IDN.USE_STD3_ASCII_RULES) + port + matcher.group(3);
	}

}

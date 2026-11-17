package com.webter.domain.user.service;

import com.webter.domain.user.dto.LinkRequest;
import com.webter.domain.user.exception.UserErrorCode;
import com.webter.global.exception.BusinessException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** 프로필 외부 링크 검증·정리. 주소는 http(s)만 허용하고 스킴이 없으면 https를 붙인다. */
final class ProfileLinks {

	private static final Pattern HAS_SCHEME = Pattern.compile("^[a-zA-Z][a-zA-Z0-9+.-]*://.*");

	private static final String SITE_NAME = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
	private static final Map<String, Rule> RULES = Map.of(
		"github", rule("(www\\.)?github\\.com", "/[A-Za-z0-9-]+(?:/.*)?"),
		"instagram", rule("(www\\.)?instagram\\.com", "/[\\w.]+(?:/.*)?"),
		"velog", rule("(www\\.)?velog\\.io", "/@[\\w.-]+(?:/.*)?"),
		"notion", rule(SITE_NAME + "\\.notion\\.site", ".*"),
		"naver_blog", rule("blog\\.naver\\.com", "/[A-Za-z0-9_-]+/?"),
		"tistory", rule(SITE_NAME + "\\.tistory\\.com", ".*"));

	private record Rule(Pattern host, Pattern path) {
	}

	private static Rule rule(String host, String path) {
		return new Rule(Pattern.compile(host), Pattern.compile(path));
	}

	private ProfileLinks() {
	}

	static Map<String, String> toMap(List<LinkRequest> links) {
		Map<String, String> result = new LinkedHashMap<>();
		if (links == null) {
			return result;
		}
		for (LinkRequest link : links) {
			if (result.put(link.kind(), normalize(link.kind(), link.url())) != null) {
				throw new BusinessException(UserErrorCode.INVALID_LINK);
			}
		}
		return result;
	}

	private static String normalize(String kind, String raw) {
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
			URI uri = URI.create(url).normalize();
			boolean secure = "https".equalsIgnoreCase(uri.getScheme());
			boolean web = secure || "http".equalsIgnoreCase(uri.getScheme());
			Rule rule = RULES.get(kind);
			if (!web || uri.getHost() == null || uri.getRawUserInfo() != null || rule == null
					|| (uri.getPort() != -1 && uri.getPort() != (secure ? 443 : 80))
					|| !rule.host().matcher(uri.getHost().toLowerCase(Locale.ROOT)).matches()
					|| !rule.path().matcher(uri.getRawPath()).matches()) {
				throw new BusinessException(UserErrorCode.INVALID_LINK);
			}
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(UserErrorCode.INVALID_LINK);
		}
		return url;
	}

}

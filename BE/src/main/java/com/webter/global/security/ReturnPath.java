package com.webter.global.security;

import java.net.URI;
import java.util.Arrays;

/** 로그인 후 돌아갈 프론트엔드 경로 검증. 같은 origin 안의 경로만 허용해 오픈 리디렉션을 막는다. */
public final class ReturnPath {

	public static final String SESSION_ATTRIBUTE = ReturnPath.class.getName();

	private ReturnPath() {
	}

	/** 유효하면 그대로, 값이 없으면 "/"를 돌려주고, 그 밖에는 IllegalArgumentException을 던진다. */
	public static String validate(String path) {
		if (path == null || path.isEmpty()) {
			return "/";
		}
		if (path.length() > 2048 || !path.startsWith("/") || path.startsWith("//") || path.contains("\\")
				|| path.chars().anyMatch(c -> c <= 32 || c == 127)) {
			throw new IllegalArgumentException("Invalid return path");
		}
		try {
			URI uri = URI.create(path);
			if (uri.isAbsolute() || uri.getRawAuthority() != null || uri.getRawFragment() != null
					|| uri.getRawPath().contains("%")
					|| Arrays.stream(uri.getPath().split("/")).anyMatch(part -> part.equals(".") || part.equals(".."))
					|| !uri.normalize().equals(uri)) {
				throw new IllegalArgumentException("Invalid return path");
			}
		}
		catch (IllegalArgumentException ex) {
			throw new IllegalArgumentException("Invalid return path");
		}
		return path;
	}

}

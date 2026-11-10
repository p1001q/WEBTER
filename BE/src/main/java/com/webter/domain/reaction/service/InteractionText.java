package com.webter.domain.reaction.service;

import com.webter.domain.reaction.exception.InteractionErrorCode;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.text.Normalizer;
import java.util.regex.Pattern;

public final class InteractionText {

	private static final Pattern LINKS = Pattern.compile("""
			(?ix)
			(?: [a-z][a-z0-9+.-]*:// | mailto: | (?<!:)//[\\p{L}\\p{N}\\[] | \\bwww\\. )
			| (?<![\\p{L}\\p{N}-]) (?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]{0,61}[\\p{L}\\p{N}])?\\.)+
			  (?:(?:[a-z]{2,63}|xn--[a-z0-9-]+)(?![a-z0-9-])|[\\p{L}&&[^\\p{ASCII}]]{2,63}(?![\\p{L}\\p{N}-]))
			| \\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b
			| \\]\\s*\\([^\\r\\n)]*\\)
			""");

	private InteractionText() {
	}

	public static String requireContent(String text) {
		if (text == null || text.isBlank() || text.codePointCount(0, text.length()) > 500
				|| text.codePoints().anyMatch(cp -> cp == 0 || (cp >= 0xd800 && cp <= 0xdfff))) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		String normalized = Normalizer.normalize(text, Normalizer.Form.NFKC)
			.replace('\u3002', '.').replace('\uff61', '.').replaceAll("\\p{Cf}", "");
		if (LINKS.matcher(normalized).find()) {
			throw new BusinessException(InteractionErrorCode.LINK_NOT_ALLOWED);
		}
		return text.strip();
	}

}

package com.webter.domain.reaction.dto;

import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

public record CursorPage<T>(List<T> items, String nextCursor) {

	public static void checkLimit(int limit) {
		if (limit < 1 || limit > 100) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
	}

	public record Position(Instant date, long id, long rank) {

		private static final Instant MAX_DATE = Instant.parse("9999-12-31T23:59:59Z");

		public String encode(String scope) {
			String payload = scope + "|" + date + "|" + id + "|" + rank;
			return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
		}

		public static Position decode(String token, String scope) {
			if (token == null) {
				return null;
			}
			try {
				if (token.length() > 200) {
					throw new IllegalArgumentException();
				}
				String[] fields = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8).split("\\|");
				if (fields.length != 4 || !scope.equals(fields[0])) {
					throw new IllegalArgumentException();
				}
				Position cursor = new Position(Instant.parse(fields[1]), Long.parseLong(fields[2]), Long.parseLong(fields[3]));
				if (cursor.id <= 0 || cursor.rank < 0 || cursor.date.isBefore(Instant.EPOCH) || cursor.date.isAfter(MAX_DATE)) {
					throw new IllegalArgumentException();
				}
				return cursor;
			}
			catch (IllegalArgumentException | DateTimeException e) {
				throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
			}
		}

	}

}

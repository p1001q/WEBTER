package com.webter.domain.user.service;

import com.webter.domain.user.dto.UserSearchResponse;
import com.webter.domain.user.dto.UserSearchResponse.Item;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.CommonErrorCode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserSearchService {

	private final JdbcClient jdbc;

	// POSITION으로 검색어를 문자 그대로 비교한다. %, _도 검색 범위를 넓히지 않는다.
	private static final String MATCH = """
			FROM users
			WHERE visibility_status = 'PUBLIC' AND account_status <> 'SUSPENDED'
			  AND (position(lower(:q) in lower(username)) > 0
			    OR position(lower(:q) in lower(nickname)) > 0)
			""";

	@Transactional(readOnly = true)
	public UserSearchResponse search(String query, int page, int size) {
		String q = query == null ? "" : query.strip();
		if (q.length() > 100 || page < 0 || size < 1 || size > 100) {
			throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
		}
		if (q.startsWith("@")) {
			q = q.substring(1).strip();
		}
		if (q.isEmpty()) {
			return new UserSearchResponse(List.of(), page, size, 0);
		}
		long total = jdbc.sql("SELECT count(*) " + MATCH).param("q", q).query(Long.class).single();
		List<Item> items = jdbc.sql("""
				SELECT user_id, username, nickname, avatar_url, coalesce(bio, '') AS bio
				""" + MATCH + """
				ORDER BY CASE
				  WHEN lower(username) = lower(:q) THEN 0
				  WHEN lower(nickname) = lower(:q) THEN 1
				  WHEN position(lower(:q) in lower(username)) = 1 THEN 2
				  WHEN position(lower(:q) in lower(nickname)) = 1 THEN 3
				  ELSE 4 END, lower(username), user_id
				LIMIT :size OFFSET :offset
				""")
			.param("q", q)
			.param("size", size)
			.param("offset", (long) page * size)
			.query((rs, i) -> new Item(rs.getObject("user_id", UUID.class), rs.getString("username"),
					rs.getString("nickname"), rs.getString("avatar_url"), rs.getString("bio")))
			.list();
		return new UserSearchResponse(items, page, size, total);
	}

}

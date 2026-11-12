package com.webter;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

// V2 기본 데이터: 정책서 4.8의 카테고리 8개와 약관·확인 문구 4종이 들어가는지 확인한다
class SeedDataTests extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void categoriesFollowPolicyOrder() {
		List<String> names = jdbc.queryForList("SELECT name FROM categories ORDER BY sort_order", String.class);

		assertThat(names).containsExactly("놀이", "생활", "학습", "생산성", "디자인·창작", "유틸리티", "개발자 도구", "기타");
	}

	@Test
	void everyPolicyDocumentTypeHasADraft() {
		List<String> types = jdbc.queryForList(
				"SELECT document_type FROM policy_documents WHERE version = 'draft-1' ORDER BY document_type",
				String.class);

		assertThat(types).containsExactly("AGE_CONFIRMATION", "PRIVACY", "SERVICE_REGISTRATION", "TERMS");
	}

	@Test
	void draftsHaveContentAndNoEffectiveDate() {
		Integer invalid = jdbc.queryForObject(
				"SELECT count(*) FROM policy_documents WHERE btrim(content) = '' OR effective_at IS NOT NULL",
				Integer.class);

		assertThat(invalid).isZero();
	}

	@Test
	void seedDoesNotContainPersonalEmail() {
		Integer withEmail = jdbc.queryForObject(
				"SELECT count(*) FROM policy_documents WHERE content ~ '[A-Za-z0-9._-]+@[A-Za-z0-9.-]+'",
				Integer.class);

		assertThat(withEmail).isZero();
	}

}

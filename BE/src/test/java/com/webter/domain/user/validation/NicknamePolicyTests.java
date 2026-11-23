package com.webter.domain.user.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NicknamePolicyTests {

	@Test
	void approvedPrefixesAreSixtyUniqueNamesWithinTheLimit() {
		assertThat(NicknamePolicy.PREFIXES).hasSize(60).doesNotHaveDuplicates();
		assertThat(NicknamePolicy.PREFIXES).allSatisfy(prefix -> {
			assertThat(prefix.length()).isLessThanOrEqualTo(4);
			assertThat(NicknamePolicy.isValid(prefix + " 주인장")).isTrue();
		});
	}

	@Test
	void generatedNamesBelongToTheApprovedList() {
		var allowed = NicknamePolicy.PREFIXES.stream().map(prefix -> prefix + " 주인장").toList();
		for (int i = 0; i < 100; i++) {
			assertThat(NicknamePolicy.generate()).isIn(allowed);
		}
	}

	@Test
	void lengthIncludesSpacesAndPreservesCharacterRules() {
		assertThat(NicknamePolicy.isValid("가나다라마바사아자")).isTrue();
		assertThat(NicknamePolicy.isValid("ABC 가나다12")).isTrue();
		for (String value : new String[] { "1234567890", "앞 공백 ", " 앞 공백", "두  칸", "ㅋㅋ", "기호!", "" }) {
			assertThat(NicknamePolicy.isValid(value)).isFalse();
		}
	}

}

package com.webter.domain.user.validation;

import java.security.SecureRandom;
import java.util.List;
import java.util.regex.Pattern;

/** 닉네임의 새 입력 규칙과 가입 시 자동 생성 목록. 기존 회원의 저장된 값은 일괄 변경하지 않는다. */
public final class NicknamePolicy {

	public static final int MAX_LENGTH = 9;

	public static final String FORM_REGEX = "(?! )(?!.* $)(?!.*  )[가-힣A-Za-z0-9 ]+";

	static final List<String> PREFIXES = List.of(
			"행복한",
			"즐거운",
			"신나는",
			"뿌듯한",
			"유쾌한",
			"명랑한",
			"들뜬",
			"싱글벙글",
			"웃음많은",
			"쾌활한",
			"발랄한",
			"재치있는",
			"따뜻한",
			"다정한",
			"친절한",
			"느긋한",
			"차분한",
			"상냥한",
			"여유로운",
			"온화한",
			"소탈한",
			"침착한",
			"포근한",
			"너그러운",
			"꼼꼼한",
			"씩씩한",
			"수줍은",
			"호탕한",
			"엉뚱한",
			"낭만적인",
			"솔직한",
			"당당한",
			"진중한",
			"용감한",
			"다부진",
			"의젓한",
			"성실한",
			"신중한",
			"세심한",
			"부지런한",
			"도전하는",
			"고민하는",
			"몰입하는",
			"집중하는",
			"꿈꾸는",
			"밤샘하는",
			"퇴근못한",
			"코딩하는",
			"설계하는",
			"구현하는",
			"빌드하는",
			"배포하는",
			"리뷰하는",
			"커밋하는",
			"푸시하는",
			"머지하는",
			"버그잡는",
			"로그보는",
			"쿼리짜는",
			"코드읽는");

	private static final Pattern FORM = Pattern.compile(FORM_REGEX);

	private static final SecureRandom RANDOM = new SecureRandom();

	private NicknamePolicy() {
	}

	public static boolean isValid(String value) {
		return value != null && value.length() <= MAX_LENGTH && FORM.matcher(value).matches();
	}

	public static String generate() {
		return PREFIXES.get(RANDOM.nextInt(PREFIXES.size())) + " 주인장";
	}

}

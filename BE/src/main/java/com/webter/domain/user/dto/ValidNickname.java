package com.webter.domain.user.dto;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.regex.Pattern;

/**
 * 닉네임 규칙(정책서 2.1). 프론트의 입력 검사(domain/validation.ts)와 같은 규칙이다.
 * 바이트 수가 아니라 가중 길이로 센다: 완성형 한글(가~힣) 2칸, 영문·숫자·공백 1칸, 합계 최대 16칸(최소 1글자).
 * 한글·영문·숫자·중간 단일 공백만 허용한다. 앞뒤·연속 공백, 초성·모음, 기호, 이모지, 탭·줄바꿈은 불가.
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidNickname.Validator.class)
public @interface ValidNickname {

	int MAX_WEIGHT = 16;

	String message() default "닉네임 형식이 올바르지 않습니다.";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<ValidNickname, String> {

		private static final Pattern FORM = Pattern.compile("(?! )(?!.* $)(?!.*  )[가-힣A-Za-z0-9 ]+");

		/** 가중 길이. 완성형 한글 2, 그 밖의 문자 1. */
		static int weight(String value) {
			int weight = 0;
			for (int i = 0; i < value.length(); i++) {
				char c = value.charAt(i);
				weight += (c >= '가' && c <= '힣') ? 2 : 1;
			}
			return weight;
		}

		@Override
		public boolean isValid(String value, ConstraintValidatorContext context) {
			if (value == null) {
				return true;
			}
			return FORM.matcher(value).matches() && weight(value) <= MAX_WEIGHT;
		}

	}

}

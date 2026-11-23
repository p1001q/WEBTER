package com.webter.domain.user.dto;

import com.webter.domain.user.validation.NicknamePolicy;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 닉네임 규칙(정책서 2.1). 프론트의 입력 검사(domain/validation.ts)와 같은 규칙이다.
 * 공백 포함 실제 글자 수로 최대 9글자(최소 1글자). 허용하는 문자는 각각 한 글자로 센다.
 * 한글·영문·숫자·중간 단일 공백만 허용한다. 앞뒤·연속 공백, 초성·모음, 기호, 이모지, 탭·줄바꿈은 불가.
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidNickname.Validator.class)
public @interface ValidNickname {

	String message() default "닉네임은 공백 포함 1~9글자의 한글·영문·숫자와 중간 단일 공백만 사용할 수 있습니다.";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<ValidNickname, String> {

		@Override
		public boolean isValid(String value, ConstraintValidatorContext context) {
			if (value == null) {
				return true;
			}
			return NicknamePolicy.isValid(value);
		}

	}

}

package com.webter.domain.webservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 미완성 값은 허용하지만 길이와 목록 상한은 등록 폼과 같이 제한한다. 접속 검사·동의는 복원하지 않는다. */
public record RegistrationDraftPayload(
		@NotNull @Size(max = 40) String name, @NotNull @Size(max = 60) String tagline,
		@NotNull @Size(max = 2048) String url, @NotNull @Size(max = 3) List<@Size(max = 30) String> cats,
		@Pattern(regexp = "|side|toy|pro") String type,
		@NotNull @Size(max = 2) List<@Pattern(regexp = "pc|mobile") String> devices,
		@Pattern(regexp = "|free|partial|paid") String price, @Pattern(regexp = "|solo|team") String owner,
		@NotNull @Size(max = 30) String team, @NotNull @Size(max = 5000) String desc,
		@NotNull @Size(max = 5) List<@Size(max = 100) String> tags, @NotNull @Size(max = 2048) String github,
		@NotNull @Size(max = 2) List<@Pattern(regexp = "ko|en") String> langs,
		@Size(max = 2048) String iconImg, @Size(max = 2048) String thumbImg,
		@NotNull @Size(max = 8) List<@NotNull @Size(max = 2048) String> pv,
		@Pattern(regexp = "land|port") String pvRatio, @Pattern(regexp = "cover|contain") String pvFit,
		boolean allowGuest, boolean allowAnon, boolean allowAnonComment,
		@Size(max = 100) String tagInput, @Min(0) @Max(10000000) Integer scrollY) {

}

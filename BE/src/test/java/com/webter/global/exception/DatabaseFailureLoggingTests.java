package com.webter.global.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.OAuthIdentity;
import com.webter.domain.user.repository.OAuthIdentityRepository;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;

/** SQL 오류에 포함된 식별자가 Hibernate·공통 예외 처리 로그로 나오지 않는지 확인한다. */
@ExtendWith(OutputCaptureExtension.class)
class DatabaseFailureLoggingTests extends DomainFixtureTest {

	@Autowired
	OAuthIdentityRepository identities;

	@Test
	void duplicateGoogleIdentityDoesNotLogKeyValues(CapturedOutput output) {
		String subject = "test-sub-not-for-logs";
		identities.saveAndFlush(OAuthIdentity.builder().user(createUser("log_first")).providerSubject(subject).build());
		var another = createUser("log_second");
		Throwable failure = catchThrowable(() -> identities
			.saveAndFlush(OAuthIdentity.builder().user(another).providerSubject(subject).build()));

		assertThat(failure).isInstanceOf(DataIntegrityViolationException.class);
		// 실제 DB 오류에는 값이 들어 있지만 애플리케이션 로그에는 남기지 않는다.
		assertThat(((DataIntegrityViolationException) failure).getMostSpecificCause().getMessage()).contains(subject);
		assertThat(output.getAll()).doesNotContain(subject);
	}

	@Test
	void unexpectedDatabaseFailureLogsOnlyDiagnosticCode(CapturedOutput output) {
		String detail = "provider_subject=test-private-sub, email=test-private@example.invalid";
		var handler = new GlobalExceptionHandler();
		for (Exception failure : new Exception[] {
				new DataIntegrityViolationException(detail, new SQLException(detail, "23505")),
				new IllegalStateException("wrapped", new SQLException(detail, "23505")) }) {
			var response = handler.handleUnexpected(failure);
			assertThat(response.getStatusCode().value()).isEqualTo(500);
			assertThat(response.getBody()).isEqualTo(com.webter.global.response.ApiResponse
				.fail(CommonErrorCode.INTERNAL_SERVER_ERROR));
		}
		assertThat(output.getAll()).contains("DB 처리 실패", "sqlState=23505")
			.doesNotContain("test-private-sub", "test-private@example.invalid", "provider_subject=");
	}

}

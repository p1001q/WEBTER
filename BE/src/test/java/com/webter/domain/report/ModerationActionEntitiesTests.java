package com.webter.domain.report;

import static org.assertj.core.api.Assertions.assertThat;

import com.webter.DomainFixtureTest;
import com.webter.domain.report.entity.ModerationAction;
import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.report.repository.ModerationActionRepository;
import com.webter.domain.report.repository.ReportRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

// 운영 조치 이력이 스키마와 맞는지, 근거 신고가 사라져도 이력이 남는지 확인한다
class ModerationActionEntitiesTests extends DomainFixtureTest {

	@Autowired
	ModerationActionRepository actionRepository;

	@Autowired
	ReportRepository reportRepository;

	@Test
	void historyRemainsWhenTheReportIsDeleted() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/moderation");
		String targetKey = String.valueOf(service.getId());
		Report report = reportRepository.save(Report.forService(createUser("rep"), service.getId(), "SPAM", null));
		actionRepository.save(ModerationAction.builder()
			.targetType(ReportTargetType.SERVICE)
			.targetKey(targetKey)
			.report(report)
			.actionType("TEMP_HIDE")
			.reason("신고 누적으로 자동 임시 비공개")
			.automatic(true)
			.build());
		flushAndClear();

		assertThat(actionRepository.findByTargetTypeAndTargetKeyOrderByCreatedAtDesc(ReportTargetType.SERVICE,
				targetKey)).singleElement().satisfies(action -> {
					assertThat(action.isAutomatic()).isTrue();
					assertThat(action.getActor()).isNull();
					assertThat(action.getActionType()).isEqualTo("TEMP_HIDE");
					assertThat(action.getCreatedAt()).isNotNull();
				});

		em.createNativeQuery("DELETE FROM reports WHERE report_id = :id").setParameter("id", report.getId())
			.executeUpdate();
		em.clear();

		assertThat(actionRepository.findByTargetTypeAndTargetKeyOrderByCreatedAtDesc(ReportTargetType.SERVICE,
				targetKey)).singleElement().satisfies(action -> assertThat(action.getReport()).isNull());
	}

}

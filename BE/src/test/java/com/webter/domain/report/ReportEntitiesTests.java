package com.webter.domain.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webter.DomainFixtureTest;
import com.webter.domain.comment.entity.ServiceComment;
import com.webter.domain.comment.repository.ServiceCommentRepository;
import com.webter.domain.report.entity.Report;
import com.webter.domain.report.entity.ReportStatus;
import com.webter.domain.report.entity.ReportTargetType;
import com.webter.domain.report.repository.ReportRepository;
import com.webter.domain.review.entity.AuthorKind;
import com.webter.domain.review.entity.Review;
import com.webter.domain.review.repository.ReviewRepository;
import com.webter.domain.user.entity.User;
import com.webter.domain.webservice.entity.WebService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

// 신고 엔티티가 V1 스키마와 맞는지, 대상별 저장과 삭제·중복 규칙이 동작하는지 확인한다.
// DB 오류가 나면 같은 트랜잭션이 중단되므로 제약 위반 확인은 테스트마다 마지막에 한 번만 한다.
class ReportEntitiesTests extends DomainFixtureTest {

	@Autowired
	ReportRepository reportRepository;

	@Autowired
	ReviewRepository reviewRepository;

	@Autowired
	ServiceCommentRepository commentRepository;

	@Test
	void savesReportsForEveryTargetType() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/report");
		Review review = reviewRepository.save(Review.builder()
			.webService(service)
			.author(owner)
			.authorKind(AuthorKind.MEMBER)
			.content("신고될 리뷰")
			.build());
		review.writeReply(owner, "제작자 답글");
		ServiceComment comment = commentRepository
			.save(ServiceComment.builder().webService(service).author(owner).content("신고될 댓글").build());
		flushAndClear();
		Review savedReview = reviewRepository.findById(review.getId()).orElseThrow();

		List<Report> reports = reportRepository.saveAll(List.of(
				Report.forService(createUser("rep1"), service.getId(), "SPAM", null),
				Report.forReview(createUser("rep2"), review.getId(), "ABUSE", "욕설"),
				Report.forReviewReply(createUser("rep3"), savedReview.getReply().getReplyId(), "SPAM", null),
				Report.forComment(createUser("rep4"), comment.getId(), "SPAM", null),
				Report.forProfile(createUser("rep5"), owner.getId(), "IMPERSONATION", null)));
		flushAndClear();

		assertThat(reportRepository.findByStatusOrderByCreatedAtAsc(ReportStatus.OPEN)).hasSize(5);
		Report found = reportRepository.findById(reports.get(1).getId()).orElseThrow();
		assertThat(found.getTargetType()).isEqualTo(ReportTargetType.REVIEW);
		assertThat(found.getTargetKey()).isEqualTo(String.valueOf(review.getId()));
		assertThat(found.getTargetReviewId()).isEqualTo(review.getId());
		assertThat(found.getTargetServiceId()).isNull();
		assertThat(found.getStatus()).isEqualTo(ReportStatus.OPEN);
		assertThat(found.getDetail()).isEqualTo("욕설");
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(reportRepository.countByTargetTypeAndTargetKey(ReportTargetType.SERVICE,
				String.valueOf(service.getId()))).isEqualTo(1);
	}

	@Test
	void resolveRecordsReviewerAndTime() {
		User owner = createUser("owner");
		User admin = createUser("admin");
		WebService service = createService(owner, "https://example.com/resolve");
		Report report = reportRepository.save(Report.forService(createUser("rep"), service.getId(), "SPAM", null));
		report.resolve(admin, "스팸 확인");
		flushAndClear();

		Report found = reportRepository.findById(report.getId()).orElseThrow();

		assertThat(found.getStatus()).isEqualTo(ReportStatus.RESOLVED);
		assertThat(found.getReviewedBy().getId()).isEqualTo(admin.getId());
		assertThat(found.getReviewedAt()).isNotNull();
		assertThat(found.getResolutionNote()).isEqualTo("스팸 확인");
	}

	@Test
	void reportKeepsTargetKeyWhenTargetIsDeleted() {
		User owner = createUser("owner");
		WebService service = createService(owner, "https://example.com/deleted");
		Report report = reportRepository.save(Report.forService(createUser("rep"), service.getId(), "SPAM", null));
		flushAndClear();

		em.createNativeQuery("DELETE FROM services WHERE service_id = :id").setParameter("id", service.getId())
			.executeUpdate();
		em.clear();

		Report found = reportRepository.findById(report.getId()).orElseThrow();
		assertThat(found.getTargetServiceId()).isNull();
		assertThat(found.getTargetKey()).isEqualTo(String.valueOf(service.getId()));
	}

	@Test
	void duplicateReportIsDetectedBeforeSaving() {
		User reporter = createUser("rep");
		WebService service = createService(createUser("owner"), "https://example.com/dup");
		reportRepository.save(Report.forService(reporter, service.getId(), "SPAM", null));
		flushAndClear();

		assertThat(reportRepository.existsByReporterAndTargetTypeAndTargetKey(reporter, ReportTargetType.SERVICE,
				String.valueOf(service.getId()))).isTrue();
	}

	@Test
	void sameReporterCannotReportTheSameTargetTwice() {
		User reporter = createUser("rep");
		WebService service = createService(createUser("owner"), "https://example.com/dup-db");
		reportRepository.saveAndFlush(Report.forService(reporter, service.getId(), "SPAM", null));

		assertThatThrownBy(() -> reportRepository
			.saveAndFlush(Report.forService(reporter, service.getId(), "ABUSE", null)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

}

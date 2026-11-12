package com.webter.domain.report;

import static com.webter.domain.report.entity.ReportReason.PHISHING_MALWARE;
import static com.webter.domain.report.entity.ReportTargetType.SERVICE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.DomainFixtureTest;
import com.webter.domain.report.dto.ReportInput;
import com.webter.domain.report.service.ReportService;
import com.webter.domain.user.entity.User;
import com.webter.global.exception.BusinessException;
import com.webter.global.security.SessionPrincipal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

class ReportApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ReportService reports;

	@Autowired
	TransactionTemplate tx;

	@Test
	void reportAndAdminEndpointsRequireMemberAndActualAdmin() throws Exception {
		User member = createUser("rp_member");
		User admin = admin();
		String serviceId = createService(member, "https://example.com/rp-auth").getId().toString();
		String json = reportBody("SERVICE", serviceId, "PHISHING_MALWARE");
		flushAndClear();

		mvc.perform(post("/api/reports").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
			.andExpect(status().isUnauthorized());
		mvc.perform(post("/api/reports").with(as(member, "USER")).contentType(MediaType.APPLICATION_JSON).content(json))
			.andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/reports")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/reports").with(as(member, "USER"))).andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/reports").with(as(member, "ADMIN"))).andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/reports").with(as(admin, "ADMIN"))).andExpect(status().isOk());

		submit(member, "SERVICE", serviceId, "ABUSE")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("REPORT_400_01"));
		submit(member, "SERVICE", serviceId, "OTHER")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("REPORT_400_02"));
		submit(member, "SERVICE", "9999999", "PHISHING_MALWARE").andExpect(status().isNotFound());
		submit(member, "SERVICE", serviceId, "PHISHING_MALWARE").andExpect(status().isCreated());
		submit(member, "SERVICE", "0" + serviceId, "UNREACHABLE")
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REPORT_409_01"));
	}

	@Test
	void countsWithdrawnReportAndRestoreStartsAnewWithoutReopeningDuplicates() throws Exception {
		User owner = createUser("rp_owner");
		User admin = admin();
		List<User> members = reporters("rp_s");
		String id = createService(owner, "https://example.com/rp-service").getId().toString();
		flushAndClear();
		submit(owner, "SERVICE", id, "UNREACHABLE").andExpect(status().isCreated());
		submit(members.get(0), "SERVICE", id, "PHISHING_MALWARE").andExpect(status().isCreated());
		jdbc.update("delete from users where user_id = ?", members.get(0).getId());
		submit(members.get(1), "SERVICE", id, "UNREACHABLE").andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.temporarilyHidden").value(false));
		submit(members.get(2), "SERVICE", id, "OWNERSHIP").andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.temporarilyHidden").value(true));

		mvc.perform(get("/api/services")).andExpect(jsonPath("$.data.items").isEmpty());
		mvc.perform(get("/api/services/" + id)).andExpect(status().isNotFound());
		mvc.perform(get("/api/services/" + id + "/reviews")).andExpect(status().isNotFound());
		mvc.perform(get("/api/users/me/services").with(as(owner, "USER")))
			.andExpect(jsonPath("$.data[0].visibility").value("TEMP_HIDDEN"))
			.andExpect(jsonPath("$.data[0].hiddenReason").isNotEmpty());
		mvc.perform(get("/api/admin/reports").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.pendingCount").value(4))
			.andExpect(jsonPath("$.data.groups.items[0].pendingCount").value(4));
		mvc.perform(get("/api/admin/temporarily-hidden").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.items[0].target.targetId").value(id));
		mvc.perform(get(adminTarget("SERVICE", id)).with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.preview.title").value("테스트 서비스"))
			.andExpect(jsonPath("$.data.reportCount").value(4))
			.andExpect(jsonPath("$.data.reasons[0].count").value(2))
			.andExpect(jsonPath("$.data.reports.items[0].reporterId").doesNotExist());

		action(admin, "SERVICE", id, "RESTORE", " ").andExpect(status().isBadRequest());
		action(admin, "SERVICE", id, "RESTORE", "검토 후 복구").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/services/" + id)).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hiddenReason").doesNotExist());
		mvc.perform(get("/api/admin/reports").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.pendingCount").value(0))
			.andExpect(jsonPath("$.data.groups.items").isEmpty());
		mvc.perform(get("/api/admin/reports").param("pendingOnly", "false").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.groups.items[0].reportCount").value(4));
		submit(owner, "SERVICE", id, "UNREACHABLE").andExpect(status().isConflict());
		submit(members.get(3), "SERVICE", id, "PHISHING_MALWARE").andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.temporarilyHidden").value(false));
		mvc.perform(get("/api/services/" + id)).andExpect(status().isOk());

		action(admin, "SERVICE", id, "HIDE", "최종 검토 결과").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/services/" + id)).andExpect(status().isNotFound());
		action(admin, "SERVICE", id, "DELETE", "위반 서비스 삭제").andExpect(status().isOk());
		mvc.perform(get("/api/services/" + id).with(as(owner, "USER"))).andExpect(status().isNotFound());
		mvc.perform(get("/api/users/me/services").with(as(owner, "USER"))).andExpect(jsonPath("$.data").isEmpty());
		mvc.perform(get(adminTarget("SERVICE", id)).with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.preview").doesNotExist()).andExpect(jsonPath("$.data.reportCount").value(5));
		mvc.perform(get("/api/admin/moderation-actions").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.items.length()").value(4))
			.andExpect(jsonPath("$.data.items[0].type").value("DELETE"))
			.andExpect(jsonPath("$.data.items[3].automatic").value(true));
	}

	@Test
	void profileModerationMasksOnlyNicknameAndBioAcrossPublicReads() throws Exception {
		User owner = createUser("rp_profile");
		User admin = admin();
		List<User> members = reporters("rp_p");
		String serviceId = createService(owner, "https://example.com/rp-profile").getId().toString();
		flushAndClear();
		jdbc.update("update users set bio = '신고 대상 소개' where user_id = ?", owner.getId());
		String id = owner.getId().toString();
		for (User member : members) {
			submit(member, "PROFILE", id, "INAPPROPRIATE_EXPRESSION").andExpect(status().isCreated());
		}
		em.clear();
		mvc.perform(get("/api/users/" + id))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.moderated").value(true))
			.andExpect(jsonPath("$.data.username").value("rp_profile"))
			.andExpect(jsonPath("$.data.nickname").value("비공개 닉네임"))
			.andExpect(jsonPath("$.data.bio").value(""))
			.andExpect(jsonPath("$.data.serviceCount").value(1));
		mvc.perform(get("/api/services/" + serviceId))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.owner.nickname").value("비공개 닉네임"));
		mvc.perform(get("/api/auth/session").with(as(owner, "USER")))
			.andExpect(jsonPath("$.data.member.bio").value("신고 대상 소개"))
			.andExpect(jsonPath("$.data.member.profileModerated").value(true));
		action(admin, "PROFILE", id, "DELETE", "프로필 삭제 요청").andExpect(status().isConflict());
		action(admin, "PROFILE", id, "DISMISS", "신고 기각").andExpect(status().isOk());
		action(admin, "PROFILE", id, "DISMISS", "중복 요청").andExpect(status().isConflict());
		mvc.perform(get("/api/admin/temporarily-hidden").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.items[0].target.targetId").value(id));
		action(admin, "PROFILE", id, "RESTORE", "검토 후 복구").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get("/api/users/" + id)).andExpect(jsonPath("$.data.bio").value("신고 대상 소개"));
	}

	@Test
	void reviewReplyAndCommentAreModeratedIndependently() throws Exception {
		User owner = createUser("rp_threads");
		User admin = admin();
		List<User> members = reporters("rp_t");
		String service = "/api/services/" + createService(owner, "https://example.com/rp-threads").getId();
		flushAndClear();
		String rid = read(write(service + "/reviews", members.get(0), "{\"text\":\"리뷰 본문\"}"), "$.data.id");
		String replyId = read(mvc.perform(put(service + "/reviews/" + rid + "/reply")
			.with(as(owner, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"제작자 답글\"}")),
			"$.data.reply.id");
		String root = read(write(service + "/comments", owner, "{\"text\":\"댓글 본문\"}"), "$.data.id");
		String child = read(write(service + "/comments", members.get(0),
			"{\"text\":\"댓글의 답글\",\"parentId\":\"" + root + "\"}"), "$.data.id");
		for (User member : members) {
			submit(member, "REVIEW_REPLY", replyId, "ABUSE").andExpect(status().isCreated());
			submit(member, "COMMENT", root, "ABUSE").andExpect(status().isCreated());
		}
		em.clear();
		mvc.perform(get(service + "/reviews"))
			.andExpect(jsonPath("$.data.items[0].text").value("리뷰 본문"))
			.andExpect(jsonPath("$.data.items[0].reply").doesNotExist());
		mvc.perform(get(service + "/comments")).andExpect(jsonPath("$.data.items").isEmpty());
		mvc.perform(get(service + "/comments").param("parentId", root)).andExpect(status().isNotFound());
		mvc.perform(get("/api/users/me/comments").with(as(members.get(0), "USER")))
			.andExpect(jsonPath("$.data").isEmpty());
		submit(members.get(1), "COMMENT", child, "ABUSE").andExpect(status().isNotFound());

		action(admin, "REVIEW_REPLY", replyId, "DELETE", "답글 조치").andExpect(status().isOk());
		action(admin, "COMMENT", root, "DELETE", "댓글 조치").andExpect(status().isOk());
		flushAndClear();
		mvc.perform(get(service + "/comments")).andExpect(jsonPath("$.data.items[0].deleted").value(true))
			.andExpect(jsonPath("$.data.items[0].text").value(""));
		mvc.perform(get(service + "/comments").param("parentId", root))
			.andExpect(jsonPath("$.data.items[0].id").value(child));
		for (User member : members) {
			submit(member, "REVIEW", rid, "ABUSE").andExpect(status().isCreated());
		}
		em.clear();
		mvc.perform(get(service + "/reviews")).andExpect(jsonPath("$.data.items").isEmpty());
		mvc.perform(get(service)).andExpect(status().isOk());
	}

	@Test
	void sanctionsAreAuditedAndBlockRegistrationAndRestrictedWrites() throws Exception {
		User admin = admin();
		User member = createUser("rp_restricted");
		String url = "/api/admin/users/" + member.getId() + "/sanctions";
		String id = createService(member, "https://example.com/rp-sanction").getId().toString();
		flushAndClear();
		adminPost(url, admin, "WARNING", "정책 위반 경고").andExpect(status().isOk());
		mvc.perform(get("/api/auth/session").with(as(member, "USER")))
			.andExpect(jsonPath("$.data.member.accountStatus").value("ACTIVE"));

		adminPost(url, admin, "REGISTRATION_RESTRICTED", "등록 규칙 위반").andExpect(status().isOk());
		flushAndClear();
		assertThat(jdbc.queryForObject("select restriction_reason from users where user_id = ?", String.class, member.getId()))
			.isEqualTo("등록 규칙 위반");
		write("/api/services", member, """
			{"name":"테스트 서비스","tagline":"등록 제한 검사","url":"https://example.com/registration",
			 "categories":["PLAY"],"projectType":"SIDE","devices":["PC"],"priceType":"FREE","agreeRegistration":true}
			""").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("SERVICE_403_02"));
		submit(member, "SERVICE", id, "OWNERSHIP").andExpect(status().isCreated());
		adminPost(url, admin, "SUSPENDED", "반복 위반").andExpect(status().isOk());
		flushAndClear();
		write("/api/services/" + id + "/comments", member, "{\"text\":\"제재된 회원의 댓글\"}")
			.andExpect(status().isForbidden());
		submit(member, "PROFILE", member.getId().toString(), "SPAM_IMPERSONATION").andExpect(status().isForbidden());
		adminPost(url, admin, "REGISTRATION_RESTRICTED", "제재 하향").andExpect(status().isConflict());
		adminPost("/api/admin/users/" + admin.getId() + "/sanctions", admin, "SUSPENDED", "관리자 제재")
			.andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/moderation-actions").with(as(admin, "ADMIN")))
			.andExpect(jsonPath("$.data.items.length()").value(3));
	}

	@Test
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	void concurrentReportsWriteOneTemporaryHideAndKeepUniqueSubmissions() throws Exception {
		var fixture = tx.execute(status -> {
			var owner = createUser("rp_par_owner");
			var members = reporters("rp_par");
			var id = createService(owner, "https://example.com/rp-parallel").getId().toString();
			return new ParallelFixture(id, owner.getId(), members.stream().map(User::getId).toList());
		});
		var ready = new CountDownLatch(5);
		var start = new CountDownLatch(1);
		try (var workers = Executors.newFixedThreadPool(5)) {
			List<Future<String>> tasks = new ArrayList<>();
			for (UUID reporter : List.of(fixture.members().get(0), fixture.members().get(1), fixture.members().get(2),
					fixture.members().get(3), fixture.members().get(3))) {
				tasks.add(workers.submit(() -> {
					ready.countDown();
					assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
					try {
						var receipt = reports.submit(reporter, new ReportInput(SERVICE, fixture.id(), PHISHING_MALWARE, null));
						return receipt.temporarilyHidden() ? "HIDDEN" : "ACCEPTED";
					}
					catch (BusinessException e) {
						return e.getErrorCode().getCode();
					}
				}));
			}
			assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
			start.countDown();
			List<String> results = new ArrayList<>();
			for (Future<String> task : tasks) {
				results.add(task.get(15, TimeUnit.SECONDS));
			}
			assertThat(results).containsExactlyInAnyOrder("ACCEPTED", "ACCEPTED", "ACCEPTED", "HIDDEN", "REPORT_409_01");
			assertThat(jdbc.queryForObject("select count(*) from moderation_actions where target_key = ? and is_automatic",
				Integer.class, fixture.id())).isEqualTo(1);
			assertThat(jdbc.queryForObject("select count(*) from reports where target_type = 'SERVICE' and target_key = ?",
				Integer.class, fixture.id())).isEqualTo(4);
		}
		finally {
			tx.executeWithoutResult(status -> {
				jdbc.update("delete from moderation_actions where target_type = 'SERVICE' and target_key = ?", fixture.id());
				jdbc.update("delete from reports where target_type = 'SERVICE' and target_key = ?", fixture.id());
				jdbc.update("delete from users where user_id = ?", fixture.owner());
				fixture.members().forEach(id -> jdbc.update("delete from users where user_id = ?", id));
			});
		}
	}

	private record ParallelFixture(String id, UUID owner, List<UUID> members) {
	}

	private User admin() {
		User user = createUser("rp_admin");
		em.flush();
		jdbc.update("update users set role = 'ADMIN' where user_id = ?", user.getId());
		em.clear();
		return user;
	}

	private List<User> reporters(String prefix) {
		return List.of(createUser(prefix + "1"), createUser(prefix + "2"), createUser(prefix + "3"), createUser(prefix + "4"));
	}

	private ResultActions submit(User reporter, String type, String id, String reason) throws Exception {
		return write("/api/reports", reporter, reportBody(type, id, reason));
	}

	private static String reportBody(String type, String id, String reason) {
		return """
			{"targetType":"%s","targetId":"%s","reason":"%s"}
			""".formatted(type, id, reason);
	}

	private ResultActions action(User admin, String type, String id, String action, String reason) throws Exception {
		return adminPost(adminTarget(type, id) + "/actions", admin, action, reason);
	}

	private ResultActions adminPost(String path, User admin, String action, String reason) throws Exception {
		return mvc.perform(post(path).with(as(admin, "ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
				{"action":"%s","reason":"%s"}
				""".formatted(action, reason)));
	}

	private static String adminTarget(String type, String id) {
		return "/api/admin/reports/" + type + "/" + id;
	}

	private ResultActions write(String path, User user, String body) throws Exception {
		return mvc.perform(post(path).with(as(user, "USER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private static String read(ResultActions result, String path) throws Exception {
		return JsonPath.read(result.andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString(), path);
	}

	private static RequestPostProcessor as(User user, String role) {
		return authentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_" + role)));
	}
}

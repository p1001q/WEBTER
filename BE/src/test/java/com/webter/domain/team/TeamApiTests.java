package com.webter.domain.team;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class TeamApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void acceptedInviteeBecomesAMakerAndBothSidesAreNotified() throws Exception {
		var owner = createUser("tm_owner");
		var invitee = createUser("tm_invitee");
		long sid = createService(owner, "https://example.com/tm-flow").getId();
		String invitationId = invite(sid, owner, "TM_Invitee");

		// 받은 사람은 알림창에서 대기 중인 초대를 본다
		mvc.perform(get("/api/notifications").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("TEAM_INVITATION"))
			.andExpect(jsonPath("$.data.items[0].actor.username").value("tm_owner"))
			.andExpect(jsonPath("$.data.items[0].serviceName").exists())
			.andExpect(jsonPath("$.data.items[0].invitation.id").value(invitationId))
			.andExpect(jsonPath("$.data.items[0].invitation.status").value("PENDING"))
			.andExpect(jsonPath("$.data.items[0].read").value(false));
		mvc.perform(get("/api/services/" + sid + "/team").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.canManage").value(true))
			.andExpect(jsonPath("$.data.invitations[0].invitee.username").value("tm_invitee"))
			.andExpect(jsonPath("$.data.memberLimit").value(5));
		// 수락 전에는 관리 권한이 없다(비공개가 아닌 서비스는 존재가 보이므로 상태 변경은 404)
		mvc.perform(put("/api/services/" + sid + "/availability").with(as(invitee)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검\"}"))
			.andExpect(status().isNotFound());

		mvc.perform(post("/api/invitations/" + invitationId + "/accept").with(as(invitee)).with(csrf()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.data.serviceId").value(String.valueOf(sid)));
		flushAndClear();

		// 받은 알림은 지우지 않고 수락함으로 남고 읽음으로 바뀐다. 보낸 사람은 결과를 받는다
		mvc.perform(get("/api/notifications").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].invitation.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.data.items[0].read").value(true));
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("TEAM_INVITATION_ACCEPTED"))
			.andExpect(jsonPath("$.data.items[0].actor.username").value("tm_invitee"));

		// 팀원은 등록자와 같은 권한: 서비스 관리, 내 서비스 목록, 프로필 집계
		mvc.perform(put("/api/services/" + sid + "/availability").with(as(invitee)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검\"}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.availability").value("UNAVAILABLE"));
		mvc.perform(get("/api/users/me/services").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].id").value(String.valueOf(sid)));
		mvc.perform(get("/api/users/" + invitee.getId())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.serviceCount").value(1));
		mvc.perform(get("/api/services/" + sid + "/team")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.members[0].user.username").value("tm_invitee"))
			.andExpect(jsonPath("$.data.invitations").isEmpty()).andExpect(jsonPath("$.data.canManage").value(false));

		// 이후 리뷰는 등록자와 팀원 모두에게 알린다
		var reviewer = createUser("tm_reviewer");
		mvc.perform(post("/api/services/" + sid + "/reviews").with(as(reviewer)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"좋아요\",\"rate\":\"RECOMMEND\"}"))
			.andExpect(status().isOk());
		for (User maker : List.of(owner, invitee)) {
			mvc.perform(get("/api/notifications").with(as(maker))).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.items[0].type").value("REVIEW_CREATED"))
				.andExpect(jsonPath("$.data.items[0].quote").value("좋아요"));
		}
	}

	@Test
	void declineKeepsTheNotificationAndAllowsInvitingAgain() throws Exception {
		var owner = createUser("tm_owner");
		var invitee = createUser("tm_invitee");
		long sid = createService(owner, "https://example.com/tm-decline").getId();
		String first = invite(sid, owner, "tm_invitee");
		mvc.perform(post("/api/services/" + sid + "/team/invitations").with(as(owner)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"tm_invitee\"}"))
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TEAM_409_02"));
		mvc.perform(post("/api/invitations/" + first + "/decline").with(as(owner)).with(csrf()))
			.andExpect(status().isForbidden());
		mvc.perform(post("/api/invitations/" + first + "/decline").with(as(invitee)).with(csrf()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("DECLINED"));
		mvc.perform(post("/api/invitations/" + first + "/accept").with(as(invitee)).with(csrf()))
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TEAM_409_04"));
		mvc.perform(get("/api/notifications").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].invitation.status").value("DECLINED"));
		mvc.perform(get("/api/notifications").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].type").value("TEAM_INVITATION_DECLINED"));
		mvc.perform(get("/api/services/" + sid + "/team").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.invitations").isEmpty());
		// 거절 뒤에도 다시 초대할 수 있다
		assertThat(invite(sid, owner, "tm_invitee")).isNotEqualTo(first);
	}

	@Test
	void cancellingAPendingInvitationDeletesTheInvitationAndTheNotification() throws Exception {
		var owner = createUser("tm_owner");
		var invitee = createUser("tm_invitee");
		long sid = createService(owner, "https://example.com/tm-cancel").getId();
		String invitationId = invite(sid, owner, "tm_invitee");
		// 대기 중인 초대 알림은 받은 사람이 지울 수 없다
		String notificationId = JsonPath.read(mvc.perform(get("/api/notifications").with(as(invitee)))
			.andReturn().getResponse().getContentAsString(), "$.data.items[0].id");
		mvc.perform(delete("/api/notifications/" + notificationId).with(as(invitee)).with(csrf()))
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOTIFICATION_409_01"));
		mvc.perform(delete("/api/notifications").with(as(invitee)).with(csrf())).andExpect(status().isOk());
		mvc.perform(get("/api/notifications").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].id").value(notificationId));

		mvc.perform(delete("/api/services/" + sid + "/team/invitations/" + invitationId).with(as(invitee))
			.with(csrf())).andExpect(status().isForbidden());
		mvc.perform(delete("/api/services/" + sid + "/team/invitations/" + invitationId).with(as(owner))
			.with(csrf())).andExpect(status().isOk());
		mvc.perform(get("/api/notifications").with(as(invitee))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items").isEmpty());
		mvc.perform(post("/api/invitations/" + invitationId + "/accept").with(as(invitee)).with(csrf()))
			.andExpect(status().isNotFound());
	}

	@Test
	void inviteRulesAndTheFiveMemberLimit() throws Exception {
		var owner = createUser("tm_owner");
		var stranger = createUser("tm_stranger");
		long sid = createService(owner, "https://example.com/tm-rules").getId();
		String url = "/api/services/" + sid + "/team/invitations";
		invitePost(url, owner, "tm_owner").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("TEAM_400_01"));
		invitePost(url, owner, "tm_nobody").andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("TEAM_404_01"));
		invitePost(url, stranger, "tm_owner").andExpect(status().isForbidden());
		mvc.perform(post(url).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"x\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/services/" + sid + "/team/candidates").param("q", "tm_").with(as(stranger)))
			.andExpect(status().isForbidden());
		mvc.perform(get("/api/services/" + sid + "/team/candidates").param("q", "tm_")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/services/" + sid + "/team/candidates").param("q", "t").with(as(owner)))
			.andExpect(status().isBadRequest());

		for (int i = 1; i <= 5; i++) {
			var user = createUser("tm_member" + i);
			String id = invite(sid, owner, user.getUsername());
			mvc.perform(post("/api/invitations/" + id + "/accept").with(as(user)).with(csrf())).andExpect(status().isOk());
		}
		var sixth = createUser("tm_sixth");
		invitePost(url, owner, "tm_member1").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("TEAM_409_01"));
		invitePost(url, owner, "tm_sixth").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("TEAM_409_03"));
		// 팀원 아닌 사람 중 아이디가 맞는 회원만 후보로 나오고, 이미 팀원이거나 등록자는 빠진다
		mvc.perform(get("/api/services/" + sid + "/team/candidates").param("q", "TM_").with(as(owner)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2))
			.andExpect(jsonPath("$.data[0].username").value("tm_sixth"));
		assertThat(sixth.getId()).isNotNull();
	}

	@Test
	void removingMembersAndThePassingOfTheOwnerSeat() throws Exception {
		var owner = createUser("tm_owner");
		var first = createUser("tm_first");
		var second = createUser("tm_second");
		long sid = createService(owner, "https://example.com/tm-remove").getId();
		// 팀원이 없는 서비스의 등록자는 뺄 수 없다
		mvc.perform(delete("/api/services/" + sid + "/team/members/" + owner.getId()).with(as(owner)).with(csrf()))
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TEAM_409_05"));
		String a = invite(sid, owner, "tm_first");
		mvc.perform(post("/api/invitations/" + a + "/accept").with(as(first)).with(csrf())).andExpect(status().isOk());
		String b = invite(sid, owner, "tm_second");
		mvc.perform(post("/api/invitations/" + b + "/accept").with(as(second)).with(csrf())).andExpect(status().isOk());
		// 팀원 둘이 모두 서비스를 관리한다. 나간 팀원(second)은 권한을 잃고 다시 초대받을 수 있다
		mvc.perform(delete("/api/services/" + sid + "/team/members/" + second.getId()).with(as(second)).with(csrf()))
			.andExpect(status().isOk());
		flushAndClear();
		mvc.perform(delete("/api/services/" + sid + "/team/members/" + second.getId()).with(as(owner)).with(csrf()))
			.andExpect(status().isNotFound());
		mvc.perform(put("/api/services/" + sid + "/availability").with(as(second)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검\"}"))
			.andExpect(status().isNotFound());
		String again = invite(sid, first, "tm_second");
		mvc.perform(post("/api/invitations/" + again + "/accept").with(as(second)).with(csrf()))
			.andExpect(status().isOk());

		// 등록자를 빼면 가장 먼저 수락한 팀원(first)이 등록자가 된다
		mvc.perform(delete("/api/services/" + sid + "/team/members/" + owner.getId()).with(as(second)).with(csrf()))
			.andExpect(status().isOk());
		mvc.perform(get("/api/services/" + sid + "/team").with(as(first))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.owner.username").value("tm_first"))
			.andExpect(jsonPath("$.data.members.length()").value(1))
			.andExpect(jsonPath("$.data.members[0].user.username").value("tm_second"));
		mvc.perform(put("/api/services/" + sid + "/availability").with(as(owner)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNAVAILABLE\",\"reason\":\"점검\"}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void withdrawingTheOwnerPassesTheServiceToTheFirstMember() throws Exception {
		var owner = createUser("tm_owner");
		var first = createUser("tm_first");
		var second = createUser("tm_second");
		long kept = createService(owner, "https://example.com/tm-withdraw-kept").getId();
		long dropped = createService(owner, "https://example.com/tm-withdraw-dropped").getId();
		for (var user : List.of(first, second)) {
			String id = invite(kept, owner, user.getUsername());
			mvc.perform(post("/api/invitations/" + id + "/accept").with(as(user)).with(csrf())).andExpect(status().isOk());
		}
		// 탈퇴한 등록자가 보낸 초대로 수락한 팀원 관계는 그대로 남는다
		flushAndClear();
		mvc.perform(delete("/api/users/me").with(as(owner)).with(csrf())).andExpect(status().isOk());
		em.flush();
		em.clear();
		assertThat(jdbc.queryForObject("select count(*) from services where service_id = ?", Long.class, dropped)).isZero();
		assertThat(jdbc.queryForObject("select owner_id from services where service_id = ?", java.util.UUID.class, kept))
			.isEqualTo(first.getId());
		assertThat(jdbc.queryForObject("select count(*) from service_members where service_id = ?", Long.class, kept))
			.isEqualTo(1);
		assertThat(jdbc.queryForObject("select user_id from service_members where service_id = ?", java.util.UUID.class, kept))
			.isEqualTo(second.getId());
		mvc.perform(get("/api/services/" + kept + "/team")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.owner.username").value("tm_first"));
	}

	private String invite(long sid, User inviter, String username) throws Exception {
		String response = invitePost("/api/services/" + sid + "/team/invitations", inviter, username)
			.andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("PENDING")).andReturn()
			.getResponse().getContentAsString();
		return JsonPath.read(response, "$.data.id");
	}

	private org.springframework.test.web.servlet.ResultActions invitePost(String url, User inviter, String username)
			throws Exception {
		return mvc.perform(post(url).with(as(inviter)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"" + username + "\"}"));
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

}

package com.webter.domain.reaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webter.DomainFixtureTest;
import com.webter.domain.team.entity.ServiceInvitation;
import com.webter.domain.team.entity.ServiceMember;
import com.webter.domain.team.repository.ServiceInvitationRepository;
import com.webter.domain.team.repository.ServiceMemberRepository;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class ReactionApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ServiceInvitationRepository invitations;

	@Autowired
	ServiceMemberRepository members;

	@Test
	void requiresMemberAndCsrfButAllowsPublicRead() throws Exception {
		var owner = createUser("re_owner");
		var member = createUser("re_member");
		var service = createService(owner, "https://example.com/re-auth");
		String url = "/api/services/" + service.getId() + "/reactions";

		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.data.liked").value(false));
		mvc.perform(put(url + "/LIKE").with(csrf())).andExpect(status().isUnauthorized());
		mvc.perform(put(url + "/LIKE").with(as(member))).andExpect(status().isForbidden());
		var pending = new SessionPrincipal.PendingSignup("pending", "pending@example.com");
		mvc.perform(put(url + "/LIKE").with(csrf()).with(authentication(new UsernamePasswordAuthenticationToken(
			pending, null, AuthorityUtils.createAuthorityList("ROLE_SIGNUP_PENDING"))))).andExpect(status().isForbidden());

		jdbc.update("update users set account_status = 'SUSPENDED' where user_id = ?", member.getId());
		em.clear();
		mvc.perform(put(url + "/LIKE").with(as(member)).with(csrf())).andExpect(status().isForbidden());
		jdbc.update("update services set visibility_status = 'TEMP_HIDDEN' where service_id = ?", service.getId());
		em.clear();
		mvc.perform(get(url)).andExpect(status().isNotFound());
	}

	@Test
	void likesAndSavesAreIndependentIdempotentAndRejectMakers() throws Exception {
		var owner = createUser("re_owner");
		var teammate = createUser("re_team");
		var member = createUser("re_member");
		var service = createService(owner, "https://example.com/re-idempotent");
		var invitation = invitations.saveAndFlush(ServiceInvitation.builder().webService(service)
			.inviter(owner).invitee(teammate).build());
		invitation.accept();
		invitations.flush();
		members.saveAndFlush(ServiceMember.builder().webService(service).user(teammate).invitation(invitation).build());
		String url = "/api/services/" + service.getId() + "/reactions";

		mvc.perform(put(url + "/LIKE").with(as(owner)).with(csrf())).andExpect(status().isForbidden());
		mvc.perform(put(url + "/SAVE").with(as(teammate)).with(csrf())).andExpect(status().isForbidden());
		for (String type : new String[] {"LIKE", "LIKE", "SAVE"}) {
			mvc.perform(put(url + "/" + type).with(as(member)).with(csrf())).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.on").value(true));
		}
		assertThat(jdbc.queryForObject("select count(*) from service_reactions where service_id = ?", Long.class,
			service.getId())).isEqualTo(2);
		for (int i = 0; i < 2; i++) {
			mvc.perform(delete(url + "/LIKE").with(as(member)).with(csrf())).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.on").value(false));
		}
		mvc.perform(get(url).with(as(member))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.liked").value(false)).andExpect(jsonPath("$.data.saved").value(true));
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

}

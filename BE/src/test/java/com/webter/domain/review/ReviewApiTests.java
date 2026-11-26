package com.webter.domain.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.webter.DomainFixtureTest;
import com.webter.domain.user.entity.User;
import com.webter.global.security.SessionPrincipal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class ReviewApiTests extends DomainFixtureTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void standaloneRatingBecomesSameReviewAndIsDeletedWithIt() throws Exception {
		var owner = createUser("rv_owner");
		var member = createUser("rv_writer");
		long sid = createService(owner, "https://example.com/rv-shared").getId();
		jdbc.update("update services set allow_anonymous_reviews = true where service_id = ?", sid);
		em.clear();
		String base = "/api/services/" + sid;
		String rating = mvc.perform(put(base + "/rating").with(as(member)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("""
				{"rate":"RECOMMEND"}
				""")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		String id = JsonPath.read(rating, "$.data.id");

		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items").isEmpty());
		mvc.perform(get(base + "/reviews/me").with(as(member))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.id").value(id));
		mvc.perform(post(base + "/reviews").with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("""
				{"text":"리뷰입니다","anon":true}
				""")).andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(id))
			.andExpect(jsonPath("$.data.rate").value("RECOMMEND"))
			.andExpect(jsonPath("$.data.edited").value(false))
			.andExpect(jsonPath("$.data.mine").value(true))
			.andExpect(jsonPath("$.data.a.uid").doesNotExist());
		assertThat(countReviews(sid)).isEqualTo(1);
		mvc.perform(delete(base + "/rating").with(as(member)).with(csrf())).andExpect(status().isConflict());
		mvc.perform(post(base + "/reviews").with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"중복\"}")).andExpect(status().isConflict());
		mvc.perform(patch(base + "/reviews/" + id).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"rate\":\"NONE\",\"text\":\"수정\",\"anon\":false}"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.rate").value("NONE"))
			.andExpect(jsonPath("$.data.edited").value(true)).andExpect(jsonPath("$.data.a.anonymous").value(true));
		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].a.uid").doesNotExist())
			.andExpect(jsonPath("$.data.items[0].canEdit").value(false));
		mvc.perform(delete(base + "/reviews/" + id).with(as(owner)).with(csrf())).andExpect(status().isForbidden());
		mvc.perform(delete(base + "/reviews/" + id).with(as(member)).with(csrf())).andExpect(status().isOk());
		em.flush();
		assertThat(countReviews(sid)).isZero();
	}

	@Test
	void canChangeAndCancelStandaloneRatingButMakerOrStoppedServiceCannotRate() throws Exception {
		var owner = createUser("rv_owner");
		var member = createUser("rv_writer");
		long sid = createService(owner, "https://example.com/rv-rating").getId();
		String base = "/api/services/" + sid;
		mvc.perform(put(base + "/rating").with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"rate\":\"RECOMMEND\"}")).andExpect(status().isForbidden());
		for (String rate : new String[] {"RECOMMEND", "NOT_RECOMMEND"}) {
			mvc.perform(put(base + "/rating").with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"rate\":\"" + rate + "\"}")).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.rate").value(rate));
		}
		assertThat(countReviews(sid)).isEqualTo(1);
		mvc.perform(delete(base + "/rating").with(as(member)).with(csrf())).andExpect(status().isOk());
		em.flush();
		assertThat(countReviews(sid)).isZero();

		jdbc.update("update services set availability_status = 'UNAVAILABLE', unavailable_reason = '중지' where service_id = ?", sid);
		em.clear();
		mvc.perform(put(base + "/rating").with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"rate\":\"RECOMMEND\"}")).andExpect(status().isConflict());
		mvc.perform(post(base + "/reviews").with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"제작자 리뷰\"}")).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("INTERACTION_403_01"));
		String memberId = write(base, member, "중지된 서비스도 미설정 리뷰는 가능");
		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].id").value(memberId))
			.andExpect(jsonPath("$.data.items[0].rate").value("NONE"));
	}

	@Test
	void ownerAndAcceptedMemberCannotWriteOrEditReviewsButCanReply() throws Exception {
		var owner = createUser("rv_maker_owner");
		var teammate = createUser("rv_teammate");
		var reader = createUser("rv_reader");
		long sid = createService(owner, "https://example.com/rv-makers").getId();
		String base = "/api/services/" + sid;
		// 팀원이 되기 전에 남긴 리뷰도 팀 수락 뒤에는 수정할 수 없다.
		String oldReview = write(base, teammate, "참여 전 리뷰");
		String readerReview = write(base, reader, "사용자 리뷰");
		String invitation = mvc.perform(post(base + "/team/invitations").with(as(owner)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"rv_teammate\"}"))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		mvc.perform(post("/api/invitations/" + JsonPath.read(invitation, "$.data.id") + "/accept")
			.with(as(teammate)).with(csrf())).andExpect(status().isOk());
		flushAndClear();

		for (User maker : java.util.List.of(owner, teammate)) {
			for (String body : new String[] {"{\"text\":\"작성 시도\"}",
				"{\"text\":\"작성 시도\",\"rate\":\"NONE\"}",
				"{\"text\":\"작성 시도\",\"rate\":\"RECOMMEND\",\"anon\":true}"}) {
				mvc.perform(post(base + "/reviews").with(as(maker)).with(csrf())
					.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden())
					.andExpect(jsonPath("$.code").value("INTERACTION_403_01"));
			}
			mvc.perform(put(base + "/reviews/" + readerReview + "/reply").with(as(maker)).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"제작자 답글\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.data.reply.text").value("제작자 답글"));
		}
		mvc.perform(patch(base + "/reviews/" + oldReview).with(as(teammate)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"수정 시도\"}"))
			.andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("INTERACTION_403_01"));
		mvc.perform(get(base + "/reviews/me").with(as(teammate))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.canEdit").value(false)).andExpect(jsonPath("$.data.canDelete").value(true));
		mvc.perform(get("/api/users/me/reviews").with(as(teammate))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].canEdit").value(false));
		assertThat(countReviews(sid)).isEqualTo(2);
		mvc.perform(delete(base + "/reviews/" + oldReview).with(as(teammate)).with(csrf()))
			.andExpect(status().isOk());
	}

	@Test
	void legacyCreatorReviewCanBeReadAndDeletedButNotEdited() throws Exception {
		var owner = createUser("rv_legacy_owner");
		long sid = createService(owner, "https://example.com/rv-legacy").getId();
		em.flush();
		Long id = jdbc.queryForObject("""
			INSERT INTO reviews (service_id, author_id, author_kind, rating, content, is_creator_review)
			VALUES (?, ?, 'MEMBER', 'NONE', '기존 제작자 리뷰', TRUE) RETURNING review_id
			""", Long.class, sid, owner.getId());
		em.clear();
		String base = "/api/services/" + sid;
		mvc.perform(get(base + "/reviews").with(as(owner))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].text").value("기존 제작자 리뷰"))
			.andExpect(jsonPath("$.data.items[0].canEdit").value(false))
			.andExpect(jsonPath("$.data.items[0].canDelete").value(true));
		mvc.perform(patch(base + "/reviews/" + id).with(as(owner)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"수정 시도\"}"))
			.andExpect(status().isForbidden());
		mvc.perform(delete(base + "/reviews/" + id).with(as(owner)).with(csrf())).andExpect(status().isOk());
	}

	@Test
	void votesAreSeparateFromRatingAndRecommendedCursorUsesLastItem() throws Exception {
		var owner = createUser("rv_owner");
		var member = createUser("rv_writer");
		var voter = createUser("rv_voter");
		String base = "/api/services/" + createService(owner, "https://example.com/rv-vote").getId();
		String first = write(base, member, "첫 리뷰");
		String second = write(base, voter, "두 번째 리뷰");
		String vote = base + "/reviews/" + first + "/vote";
		mvc.perform(put(vote).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"vote\":\"UP\"}")).andExpect(status().isForbidden());
		for (String type : new String[] {"DOWN", "UP", "UP"}) {
			mvc.perform(put(vote).with(as(voter)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"vote\":\"" + type + "\"}")).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mine").value(type))
				.andExpect(jsonPath("$.data.up").value(type.equals("UP") ? 1 : 0))
				.andExpect(jsonPath("$.data.down").value(type.equals("DOWN") ? 1 : 0));
		}
		String page = mvc.perform(get(base + "/reviews").param("limit", "1").with(as(voter))).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].id").value(first))
			.andExpect(jsonPath("$.data.items[0].rate").value("NONE"))
			.andExpect(jsonPath("$.data.items[0].votes.mine").value("UP"))
			.andReturn().getResponse().getContentAsString();
		String cursor = JsonPath.read(page, "$.data.nextCursor");
		mvc.perform(get(base + "/reviews").param("limit", "1").param("cursor", cursor))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].id").value(second))
			.andExpect(jsonPath("$.data.nextCursor").doesNotExist());
		mvc.perform(get(base + "/reviews").param("sort", "LATEST").param("cursor", cursor))
			.andExpect(status().isBadRequest());
		mvc.perform(get(base + "/reviews").param("sort", "LATEST"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].id").value(second));
		mvc.perform(delete(vote).with(as(voter)).with(csrf())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.up").value(0)).andExpect(jsonPath("$.data.mine").doesNotExist());
	}

	@Test
	void makerReplyHasIndependentEditStateAndBlocksLinksAndCrossServiceAccess() throws Exception {
		var owner = createUser("rv_owner");
		var member = createUser("rv_writer");
		String base = "/api/services/" + createService(owner, "https://example.com/rv-reply").getId();
		String other = "/api/services/" + createService(owner, "https://example.com/rv-other").getId();
		String id = write(base, member, "리뷰");
		String suffix = "/reviews/" + id + "/reply";
		mvc.perform(put(other + suffix).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"다른 서비스\"}")).andExpect(status().isNotFound());
		mvc.perform(put(base + suffix).with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"제작자가 아님\"}")).andExpect(status().isForbidden());
		mvc.perform(put(base + suffix).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"［링크］（https：／／example.com）\"}")).andExpect(status().isBadRequest());
			mvc.perform(post(base + "/reviews").with(as(member)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"example.com에서 확인\"}")).andExpect(status().isBadRequest());
		mvc.perform(put(base + suffix).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"감사합니다\"}")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.reply.edited").value(false))
			.andExpect(jsonPath("$.data.reply.withdrawn").value(false))
			.andExpect(jsonPath("$.data.reply.author.uid").value(owner.getId().toString()))
			.andExpect(jsonPath("$.data.reply.author.handle").value("rv_owner"));
		UUID replyId = jdbc.queryForObject("select reply_id from reviews where review_id = ?", UUID.class, Long.parseLong(id));
		mvc.perform(put(base + suffix).with(as(owner)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"의견 감사합니다\"}")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.reply.edited").value(true))
			.andExpect(jsonPath("$.data.edited").value(false));
		assertThat(jdbc.queryForObject("select reply_id from reviews where review_id = ?", UUID.class, Long.parseLong(id)))
			.isEqualTo(replyId);
		// 탈퇴 시 외래키가 답글 작성자를 비운 뒤에도 답글은 공개된다.
		em.flush();
		jdbc.update("update reviews set reply_author_id = null where review_id = ?", Long.parseLong(id));
		em.clear();
		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].reply.withdrawn").value(true))
			.andExpect(jsonPath("$.data.items[0].reply.author.withdrawn").value(true))
			.andExpect(jsonPath("$.data.items[0].reply.author.uid").doesNotExist());
		mvc.perform(delete(base + suffix).with(as(owner)).with(csrf())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.reply").doesNotExist());
	}

	@Test
	void teamMemberReplyShowsTheMemberAsAuthor() throws Exception {
		var owner = createUser("rv_team_owner");
		var teammate = createUser("rv_teammate");
		var member = createUser("rv_team_writer");
		var service = createService(owner, "https://example.com/rv-team-reply");
		em.flush();
		Long invitation = jdbc.queryForObject("""
				insert into service_invitations (service_id, inviter_id, invitee_id, status, accepted_at)
				values (?, ?, ?, 'ACCEPTED', now()) returning invitation_id
				""", Long.class, service.getId(), owner.getId(), teammate.getId());
		jdbc.update("insert into service_members (service_id, user_id, invitation_id) values (?, ?, ?)",
				service.getId(), teammate.getId(), invitation);
		String base = "/api/services/" + service.getId();
		String id = write(base, member, "리뷰");
		mvc.perform(put(base + "/reviews/" + id + "/reply").with(as(teammate)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"팀원 답글\"}")).andExpect(status().isOk());
		// 답글은 등록자가 아니라 실제로 답글을 단 팀원의 이름으로 보인다
		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items[0].reply.author.uid").value(teammate.getId().toString()))
			.andExpect(jsonPath("$.data.items[0].reply.author.handle").value("rv_teammate"))
			.andExpect(jsonPath("$.data.items[0].reply.author.withdrawn").value(false));
	}

	@Test
	void guestReviewRequiresServiceOptInAndCsrfWithoutOpeningOtherWrites() throws Exception {
		var owner = createUser("rv_guest_owner");
		long sid = createService(owner, "https://example.com/rv-guest-permissions").getId();
		String base = "/api/services/" + sid;
		String body = "{\"text\":\"비회원 리뷰\"}";
		mvc.perform(post(base + "/reviews/guest").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("INTERACTION_403_03"));
		allowGuestReviews(sid);
		mvc.perform(post(base + "/reviews").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isUnauthorized());
		mvc.perform(post(base + "/reviews/guest").with(as(owner)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
		mvc.perform(post(base + "/reviews/guest").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isForbidden());
		var pending = new SessionPrincipal.PendingSignup("pending", "pending@example.test");
		mvc.perform(post(base + "/reviews/guest").with(csrf()).with(authentication(new UsernamePasswordAuthenticationToken(
			pending, null, AuthorityUtils.createAuthorityList("ROLE_SIGNUP_PENDING"))))
			.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
		mvc.perform(post(base + "/comments").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isUnauthorized());
		mvc.perform(put(base + "/rating").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"rate\":\"RECOMMEND\"}")).andExpect(status().isUnauthorized());
		mvc.perform(post(base + "/reviews/guest").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"평가 요청\",\"rate\":\"RECOMMEND\"}")).andExpect(status().isBadRequest());
		mvc.perform(post(base + "/reviews/guest").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"https://example.com/\"}")).andExpect(status().isBadRequest());
		assertThat(countReviews(sid)).isZero();
	}

	@Test
	void guestReviewStoresHashAndAllowsOnePerServiceForTheSameAddress() throws Exception {
		var owner = createUser("rv_guest_owner");
		var member = createUser("rv_guest_member");
		long sid = createService(owner, "https://example.com/rv-guest-create").getId();
		long other = createService(owner, "https://example.com/rv-guest-other").getId();
		allowGuestReviews(sid);
		allowGuestReviews(other);
		String base = "/api/services/" + sid;
		var response = mvc.perform(guestReview(sid, "203.0.113.42", "198.51.100.1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.a.kind").value("GUEST"))
			.andExpect(jsonPath("$.data.a.ip").value("203.0"))
			.andExpect(jsonPath("$.data.a.uid").doesNotExist())
			.andExpect(jsonPath("$.data.rate").value("NONE"))
			.andExpect(jsonPath("$.data.canEdit").value(false))
			.andExpect(jsonPath("$.data.canDelete").value(false))
			.andReturn().getResponse().getContentAsString();
		String reviewId = JsonPath.read(response, "$.data.id");
		assertThat(response).doesNotContain("203.0.113.42", "guestIpHmac");
		String hash = jdbc.queryForObject("select guest_ip_hmac from reviews where review_id = ?", String.class,
			Long.parseLong(reviewId));
		assertThat(hash).matches("[a-f0-9]{64}");
		mvc.perform(guestReview(sid, "203.0.113.42", "198.51.100.2"))
			.andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INTERACTION_409_05"));
		mvc.perform(guestReview(other, "203.0.113.42", "198.51.100.2")).andExpect(status().isOk());
		mvc.perform(guestReview(sid, "2001:db8::42", "198.51.100.2")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.a.ip").doesNotExist());
		mvc.perform(guestReview(sid, "2001:0db8:0:0:0:0:0:42", "198.51.100.3")).andExpect(status().isConflict());
		assertThat(countReviews(sid)).isEqualTo(2);

		String path = base + "/reviews/" + reviewId;
		mvc.perform(patch(path).with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"비회원 수정\"}")).andExpect(status().isUnauthorized());
		mvc.perform(delete(path).with(csrf())).andExpect(status().isUnauthorized());
		mvc.perform(delete(path).with(as(member)).with(csrf())).andExpect(status().isForbidden());
		mvc.perform(get(base + "/reviews")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.items.length()").value(2));
	}

	private void allowGuestReviews(long sid) {
		jdbc.update("update services set allow_guest_reviews = true where service_id = ?", sid);
		em.clear();
	}

	private static MockHttpServletRequestBuilder guestReview(
			long sid, String address, String forwarded) {
		return post("/api/services/{sid}/reviews/guest", sid).with(csrf()).with(request -> {
			request.setRemoteAddr(address);
			return request;
		}).header("X-Forwarded-For", forwarded).contentType(MediaType.APPLICATION_JSON)
			.content("{\"text\":\"비회원 리뷰\",\"rate\":\"NONE\"}");
	}

	private String write(String base, User member, String text) throws Exception {
		String response = mvc.perform(post(base + "/reviews").with(as(member)).with(csrf())
			.contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"" + text + "\"}"))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return JsonPath.read(response, "$.data.id");
	}

	private long countReviews(long serviceId) {
		return jdbc.queryForObject("select count(*) from reviews where service_id = ?", Long.class, serviceId);
	}

	private static RequestPostProcessor as(User user) {
		return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal.Member(user.getId()),
			null, AuthorityUtils.createAuthorityList("ROLE_USER")));
	}

}

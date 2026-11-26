package com.webter.demo;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.webter.demo.DemoPlan.Cmt;
import com.webter.demo.DemoPlan.Kind;
import com.webter.demo.DemoPlan.Member;
import com.webter.demo.DemoPlan.Moderation;
import com.webter.demo.DemoPlan.Rev;
import com.webter.demo.DemoPlan.Svc;
import com.webter.demo.DemoPlan.TargetType;
import com.webter.domain.user.service.AccountService;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.json.JsonMapper;

/**
 * 업무 데이터를 지우고 {@link DemoPlan}대로 다시 채운다. 이미지 업로드를 뺀 전체가 한 트랜잭션이라
 * 중간에 실패하면 DB는 실행 전 상태로 돌아간다.
 *
 * <p>보존: 본계정(회원·Google 연결·동의·관심 카테고리·권한), 카테고리·약관, Flyway 이력, URL 검사 캐시,
 * 시연 이미지가 아닌 업로드 기록(참조가 끊긴 파일은 기존 정리 작업이 처리한다).
 * 삭제: 본계정 외 회원과 서비스·리뷰·댓글·반응·이벤트·알림·신고·조치·초대·팀원·회고·초안·사용 횟수.
 */
@Slf4j
@Component
class DemoSeeder {

	private static final String AUTO_HIDE_REASON = "신고가 누적되어 검토 중이에요.";
	private static final String URL_PREFIX = "https://example.com/webter-demo/";

	private final JdbcClient jdbc;
	private final NamedParameterJdbcTemplate batch;
	private final TransactionTemplate tx;
	private final DemoImages images;
	private final AccountService accounts;
	private final JsonMapper json = JsonMapper.builder().build();

	DemoSeeder(JdbcClient jdbc, NamedParameterJdbcTemplate batch, TransactionTemplate tx, DemoImages images,
			AccountService accounts) {
		this.jdbc = jdbc;
		this.batch = batch;
		this.tx = tx;
		this.images = images;
		this.accounts = accounts;
	}

	Map<String, Object> run(String ownerEmail, DemoPlan plan) {
		UUID me = jdbc.sql("SELECT user_id FROM users WHERE lower(email) = lower(:email)")
			.param("email", ownerEmail).query(UUID.class).optional()
			.orElseThrow(() -> new IllegalStateException("DEMO_OWNER_EMAIL과 같은 이메일의 회원이 없습니다. 본계정으로 먼저 가입해 주세요."));
		var owner = jdbc.sql("SELECT role, account_status FROM users WHERE user_id = :id").param("id", me)
			.query((rs, i) -> rs.getString(1) + "/" + rs.getString(2)).single();
		if (!"ADMIN/ACTIVE".equals(owner)) {
			throw new IllegalStateException("본계정이 운영자(ADMIN)·정상(ACTIVE) 상태가 아닙니다: " + owner);
		}
		Set<String> names = new LinkedHashSet<>();
		plan.members.forEach(m -> addImage(names, m.avatar));
		plan.services.forEach(s -> {
			addImage(names, s.icon);
			addImage(names, s.thumb);
			s.previews.forEach(p -> addImage(names, p));
		});
		var uploaded = images.upload(names);
		log.info("시연 이미지 {}장을 올렸습니다.", uploaded.size());
		return tx.execute(status -> new Writer(plan, me, uploaded).write());
	}

	private static void addImage(Set<String> names, String name) {
		if (name != null) {
			names.add(name);
		}
	}

	private final class Writer {

		private final DemoPlan plan;
		private final UUID me;
		private final Map<String, DemoImages.Uploaded> uploaded;
		private final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
		private final Random random = new Random(72);
		private final Map<String, UUID> users = new HashMap<>();
		private final Map<String, Long> services = new HashMap<>();
		private final Map<String, Svc> specs = new HashMap<>();
		/** 서비스 키 → (팀원 키 → 합류 시각) */
		private final Map<String, Map<String, Instant>> teams = new HashMap<>();
		private final Map<String, ReviewRow> reviews = new HashMap<>();
		private final Map<String, CommentRow> comments = new HashMap<>();
		/** 서비스별로 이미 리뷰·평가를 남긴 회원 */
		private final Map<String, Set<String>> reviewed = new HashMap<>();
		private final List<MapSqlParameterSource> notifications = new ArrayList<>();

		Writer(DemoPlan plan, UUID me, Map<String, DemoImages.Uploaded> uploaded) {
			this.plan = plan;
			this.me = me;
			this.uploaded = uploaded;
			users.put(DemoPlan.ME, me);
		}

		Map<String, Object> write() {
			wipe();
			trackImages();
			plan.members.forEach(this::insertMember);
			plan.services.forEach(this::insertService);
			plan.invites.forEach(this::insertInvite);
			for (Svc s : plan.services) {
				s.reviews.forEach(r -> insertReview(s, r));
				insertRatings(s);
				s.comments.forEach(c -> insertComment(s, c, null));
				insertReactions(s);
				insertEvents(s);
			}
			plan.reflections.forEach(this::insertReflection);
			insertDraft();
			// 운영 조치의 삭제가 알림 대상을 지우기 전에(외래키가 NULL로 바뀌도록) 먼저 저장한다
			flushNotifications();
			plan.moderations.forEach(this::moderate);
			plan.sanctions.forEach(this::sanction);
			flushNotifications();
			for (Member m : plan.members) {
				if (m.withdraw) {
					accounts.withdraw(users.get(m.key));
				}
			}
			return summary();
		}

		// ---------- 정리 ----------

		private void wipe() {
			for (String sql : List.of(
					"DELETE FROM notifications",
					"DELETE FROM moderation_actions",
					"DELETE FROM reports",
					"DELETE FROM review_votes",
					"DELETE FROM reviews",
					"DELETE FROM service_comments",
					"DELETE FROM service_reactions",
					"DELETE FROM service_events",
					"DELETE FROM service_count_blocks",
					"DELETE FROM daily_usage",
					"DELETE FROM service_members",
					"DELETE FROM service_invitations",
					"DELETE FROM service_versions",
					"DELETE FROM service_tags",
					"DELETE FROM service_categories",
					"DELETE FROM user_reflections",
					"DELETE FROM service_registration_drafts",
					"DELETE FROM services",
					"DELETE FROM tags",
					"DELETE FROM image_upload_usage WHERE object_key LIKE '" + DemoImages.KEY_PREFIX + "%'")) {
				jdbc.sql(sql).update();
			}
			int removed = jdbc.sql("DELETE FROM users WHERE user_id <> :me").param("me", me).update();
			log.info("본계정 외 회원 {}명을 지웠습니다.", removed);
		}

		private void trackImages() {
			for (var image : uploaded.values()) {
				jdbc.sql("""
						INSERT INTO image_upload_usage(object_key, user_id, image_url, size_bytes, issued_at, promoted_at,
						  pending_pruned, retain_until, unused_since)
						VALUES (:key, NULL, :url, :size, :now, :now, true, :now, NULL)
						""").param("key", image.key()).param("url", image.url()).param("size", image.size())
					.param("now", ts(0)).update();
			}
		}

		// ---------- 회원 ----------

		private void insertMember(Member m) {
			UUID id = UUID.randomUUID();
			users.put(m.key, id);
			Timestamp joined = ts(m.joinedDays);
			jdbc.sql("""
					INSERT INTO users(user_id, username, nickname, email, avatar_url, bio, role, account_status,
					  restriction_reason, visibility_status, hidden_reason, onboarding_completed_at, profile_links,
					  created_at, updated_at)
					VALUES (:id, :username, :nickname, NULL, :avatar, :bio, :role, 'ACTIVE', NULL, 'PUBLIC', NULL,
					  :joined, CAST(:links AS jsonb), :joined, :joined)
					""").param("id", id).param("username", m.username).param("nickname", m.nickname)
				.param("avatar", image(m.avatar)).param("bio", m.bio).param("role", m.role)
				.param("joined", joined).param("links", json.writeValueAsString(m.links)).update();
			short order = 1;
			for (String code : m.interests) {
				jdbc.sql("""
						INSERT INTO user_interests(user_id, category_id, sort_order, created_at)
						SELECT :id, category_id, :order, :joined FROM categories WHERE code = :code
						""").param("id", id).param("order", order++).param("joined", joined).param("code", code).update();
			}
			jdbc.sql("""
					INSERT INTO user_consents(user_id, policy_document_id, agreed_at)
					SELECT :id, max(policy_document_id), :joined FROM policy_documents
					WHERE document_type IN ('TERMS', 'PRIVACY', 'AGE_CONFIRMATION') GROUP BY document_type
					""").param("id", id).param("joined", joined).update();
		}

		// ---------- 서비스 ----------

		private void insertService(Svc s) {
			specs.put(s.key, s);
			String url = URL_PREFIX + s.slug;
			Timestamp created = ts(s.createdDays);
			Long id = jdbc.sql("""
					INSERT INTO services(owner_id, name, tagline, description_markdown, service_url, canonical_url,
					  github_url, project_type, price_type, registrant_type, team_name, availability_status,
					  unavailable_reason, visibility_status, hidden_reason, icon_url, thumbnail_url, preview_ratio,
					  preview_fit, allow_guest_reviews, allow_anonymous_reviews, allow_anonymous_comments,
					  registration_policy_id, registration_agreed_at, url_checked_at, url_rechecked_at, device_codes,
					  language_codes, preview_images, created_at, updated_at)
					VALUES (:owner, :name, :tagline, :description, :url, :canonical, :github, :project, :price,
					  :registrant, :team, :availability, :unavailable, :visibility, :hidden, :icon, :thumb, :ratio,
					  :fit, :guest, :anonReview, :anonComment,
					  (SELECT max(policy_document_id) FROM policy_documents WHERE document_type = 'SERVICE_REGISTRATION'),
					  :created, :created, :now, CAST(:devices AS jsonb), CAST(:langs AS jsonb), CAST(:previews AS jsonb),
					  :created, :created)
					RETURNING service_id
					""")
				.param("owner", user(s.owner)).param("name", s.name).param("tagline", s.tagline)
				.param("description", s.description).param("url", url).param("canonical", url.toLowerCase())
				.param("github", s.github).param("project", s.project).param("price", s.price)
				.param("registrant", s.team == null ? "INDIVIDUAL" : "TEAM").param("team", s.team)
				.param("availability", s.unavailable == null ? "AVAILABLE" : "UNAVAILABLE")
				.param("unavailable", s.unavailable).param("visibility", s.visibility).param("hidden", s.hiddenReason)
				.param("icon", image(s.icon)).param("thumb", image(s.thumb)).param("ratio", s.ratio).param("fit", s.fit)
				.param("guest", s.guest).param("anonReview", s.anonReview).param("anonComment", s.anonComment)
				.param("created", created).param("now", ts(0)).param("devices", json.writeValueAsString(s.devices))
				.param("langs", json.writeValueAsString(s.langs))
				.param("previews", json.writeValueAsString(s.previews.stream().map(this::image).toList()))
				.query(Long.class).single();
			services.put(s.key, id);
			teams.put(s.key, new LinkedHashMap<>());
			short order = 1;
			for (String code : s.cats) {
				jdbc.sql("""
						INSERT INTO service_categories(service_id, category_id, sort_order)
						SELECT :id, category_id, :order FROM categories WHERE code = :code
						""").param("id", id).param("order", order++).param("code", code).update();
			}
			order = 1;
			for (String tag : s.tags) {
				jdbc.sql("""
						INSERT INTO tags(name, normalized_name) VALUES (:name, lower(:name))
						ON CONFLICT (normalized_name) DO NOTHING
						""").param("name", tag).update();
				jdbc.sql("""
						INSERT INTO service_tags(service_id, tag_id, sort_order)
						SELECT :id, tag_id, :order FROM tags WHERE normalized_name = lower(:name)
						""").param("id", id).param("order", order++).param("name", tag).update();
			}
			for (var v : s.versions) {
				jdbc.sql("""
						INSERT INTO service_versions(service_id, version, title, content, created_at, updated_at)
						VALUES (:id, :version, :title, :content, :at, :at)
						""").param("id", id).param("version", v.version()).param("title", v.title())
					.param("content", v.content()).param("at", ts(v.days())).update();
			}
		}

		// ---------- 팀 ----------

		private void insertInvite(DemoPlan.Invite i) {
			long service = service(i.service());
			UUID inviter = user(i.inviter());
			UUID invitee = user(i.invitee());
			boolean accepted = "ACCEPTED".equals(i.status());
			boolean pending = "PENDING".equals(i.status());
			Long id = jdbc.sql("""
					INSERT INTO service_invitations(service_id, inviter_id, invitee_id, status, created_at, accepted_at)
					VALUES (:service, :inviter, :invitee, :status, :at, :accepted) RETURNING invitation_id
					""").param("service", service).param("inviter", inviter).param("invitee", invitee)
				.param("status", i.status()).param("at", ts(i.days()))
				.param("accepted", accepted ? ts(i.respondedDays()) : null).query(Long.class).single();
			notify(invitee, inviter, "TEAM_INVITATION", service, i.days(), pending ? null : ts(i.respondedDays()))
				.addValue("invitation", id);
			if (pending) {
				return;
			}
			if (accepted) {
				jdbc.sql("""
						INSERT INTO service_members(service_id, user_id, invitation_id, joined_at)
						VALUES (:service, :user, :invitation, :at)
						""").param("service", service).param("user", invitee).param("invitation", id)
					.param("at", ts(i.respondedDays())).update();
				teams.get(i.service()).put(i.invitee(), at(i.respondedDays()));
			}
			notify(inviter, invitee, accepted ? "TEAM_INVITATION_ACCEPTED" : "TEAM_INVITATION_DECLINED", service,
					i.respondedDays(), readAt(i.respondedDays())).addValue("invitation", id);
		}

		private List<String> makers(String serviceKey, double days) {
			List<String> result = new ArrayList<>();
			result.add(specs.get(serviceKey).owner);
			teams.get(serviceKey).forEach((member, joined) -> {
				if (!joined.isAfter(at(days))) {
					result.add(member);
				}
			});
			return result;
		}

		private boolean isMaker(String serviceKey, String user) {
			return specs.get(serviceKey).owner.equals(user) || teams.get(serviceKey).containsKey(user);
		}

		// ---------- 리뷰 ----------

		private void insertReview(Svc s, Rev r) {
			long service = service(s.key);
			boolean guest = "guest".equals(r.author);
			boolean creator = !guest && makers(s.key, r.days).contains(r.author);
			if ((guest || creator) && !"NONE".equals(r.rate)) {
				throw new IllegalStateException("비회원·제작자 리뷰에는 평가가 없어야 합니다: " + r.key);
			}
			if ((r.anonymous && (!s.anonReview || creator)) || (guest && !s.guest)) {
				throw new IllegalStateException("서비스 설정과 맞지 않는 리뷰입니다: " + r.key);
			}
			if (!guest && !reviewed.computeIfAbsent(s.key, k -> new HashSet<>()).add(r.author)) {
				throw new IllegalStateException("같은 회원의 리뷰가 두 개입니다: " + r.key);
			}
			Timestamp created = ts(r.days);
			UUID replyId = r.replyAuthor == null ? null : UUID.randomUUID();
			String rate = switch (r.rate) {
				case "UP" -> "RECOMMEND";
				case "DOWN" -> "NOT_RECOMMEND";
				case "NONE" -> "NONE";
				default -> throw new IllegalStateException("평가는 UP·DOWN·NONE 중 하나입니다: " + r.key);
			};
			Long id = jdbc.sql("""
					INSERT INTO reviews(service_id, author_id, author_kind, guest_ip_hmac, guest_ip_display, rating,
					  content, is_anonymous, is_creator_review, visibility_status, created_at, updated_at, recommended_at,
					  reply_id, reply_author_id, reply_content, reply_visibility_status, reply_created_at, reply_updated_at)
					VALUES (:service, :author, :kind, :hmac, :ip, :rate, :text, :anon, :creator, 'PUBLIC', :created,
					  :updated, :recommended, :replyId, :replyAuthor, :replyText, :replyVisibility, :replyAt, :replyUpdated)
					RETURNING review_id
					""")
				.param("service", service).param("author", guest ? null : user(r.author))
				.param("kind", guest ? "GUEST" : "MEMBER").param("hmac", guest ? "demo-guest:" + s.key + ":" + r.key : null)
				.param("ip", guest ? r.guestIp : null).param("rate", rate).param("text", r.text)
				.param("anon", r.anonymous).param("creator", creator).param("created", created)
				.param("updated", r.editedDays == null ? created : ts(r.editedDays))
				.param("recommended", "UP".equals(r.rate) ? created : null).param("replyId", replyId)
				.param("replyAuthor", replyId == null ? null : user(r.replyAuthor)).param("replyText", r.replyText)
				.param("replyVisibility", replyId == null ? null : "PUBLIC")
				.param("replyAt", replyId == null ? null : ts(r.replyDays))
				.param("replyUpdated", replyId == null ? null
						: ts(r.replyEditedDays == null ? r.replyDays : r.replyEditedDays))
				.query(Long.class).single();
			reviews.put(r.key, new ReviewRow(id, s.key, guest ? null : r.author, replyId, r.replyAuthor));
			vote(r, id, r.up, "UP");
			vote(r, id, r.down, "DOWN");
			for (String maker : makers(s.key, r.days)) {
				if (!maker.equals(r.author)) {
					notify(user(maker), guest || r.anonymous ? null : user(r.author), "REVIEW_CREATED", service, r.days,
							readAt(r.days)).addValue("review", id);
				}
			}
			if (replyId != null) {
				if (!isMaker(s.key, r.replyAuthor) || r.replyAuthor.equals(r.author)) {
					throw new IllegalStateException("제작자만 남의 리뷰에 답글을 달 수 있습니다: " + r.key);
				}
				if (!guest) {
					notify(user(r.author), user(r.replyAuthor), "REVIEW_REPLY", service, r.replyDays, readAt(r.replyDays))
						.addValue("review", id);
				}
			}
		}

		private void vote(Rev r, long reviewId, List<String> voters, String type) {
			for (String voter : voters) {
				if (voter.equals(r.author) || "guest".equals(r.author)) {
					throw new IllegalStateException("투표할 수 없는 리뷰입니다: " + r.key);
				}
				jdbc.sql("""
						INSERT INTO review_votes(user_id, review_id, vote_type, created_at, updated_at)
						VALUES (:user, :review, :type, :at, :at)
						""").param("user", user(voter)).param("review", reviewId).param("type", type)
					.param("at", ts(Math.max(r.days - 0.5, 0.05))).update();
			}
		}

		/** 본문 없이 추천·비추천만 남긴 평가(목록에는 보이지 않고 집계에만 들어간다) */
		private void insertRatings(Svc s) {
			Set<String> used = reviewed.computeIfAbsent(s.key, k -> new HashSet<>());
			List<String> pool = new ArrayList<>(plan.raters.stream()
				.filter(r -> !used.contains(r) && !isMaker(s.key, r)).toList());
			for (var rating : s.ratings) {
				if (rating.up() + rating.down() > pool.size()) {
					throw new IllegalStateException("평가 회원이 부족합니다: " + s.key);
				}
				for (int i = 0; i < rating.up() + rating.down(); i++) {
					String rater = pool.removeFirst();
					used.add(rater);
					boolean up = i < rating.up();
					Timestamp at = ts(between(rating.fromDays(), rating.toDays()));
					jdbc.sql("""
							INSERT INTO reviews(service_id, author_id, author_kind, rating, content, created_at, updated_at,
							  recommended_at)
							VALUES (:service, :author, 'MEMBER', :rate, '', :at, :at, :recommended)
							""").param("service", service(s.key)).param("author", user(rater))
						.param("rate", up ? "RECOMMEND" : "NOT_RECOMMEND").param("at", at)
						.param("recommended", up ? at : null).update();
				}
			}
		}

		// ---------- 댓글 ----------

		private void insertComment(Svc s, Cmt c, CommentRow parent) {
			long service = service(s.key);
			if (c.anonymous && (!s.anonComment || isMaker(s.key, c.author))) {
				throw new IllegalStateException("서비스 설정과 맞지 않는 익명 댓글입니다: " + c.key);
			}
			if (c.deleted && c.replies.isEmpty()) {
				throw new IllegalStateException("답글이 없는 삭제 댓글은 남지 않습니다: " + c.key);
			}
			Timestamp created = ts(c.days);
			Long id = jdbc.sql("""
					INSERT INTO service_comments(service_id, parent_comment_id, author_id, content, is_anonymous,
					  deleted_at, created_at, updated_at)
					VALUES (:service, :parent, :author, :text, :anon, :deleted, :created, :updated)
					RETURNING comment_id
					""").param("service", service).param("parent", parent == null ? null : parent.id())
				.param("author", c.deleted ? null : user(c.author)).param("text", c.deleted ? "" : c.text)
				.param("anon", !c.deleted && c.anonymous).param("deleted", c.deleted ? ts(c.days - 0.2) : null)
				.param("created", created).param("updated", c.editedDays == null ? created : ts(c.editedDays))
				.query(Long.class).single();
			CommentRow row = new CommentRow(id, s.key, c.deleted ? null : c.author);
			comments.put(c.key, row);
			if (!c.deleted) {
				UUID actor = c.anonymous ? null : user(c.author);
				if (parent == null) {
					for (String maker : makers(s.key, c.days)) {
						if (!maker.equals(c.author)) {
							notify(user(maker), actor, "COMMENT_CREATED", service, c.days, readAt(c.days))
								.addValue("comment", id);
						}
					}
				}
				else if (parent.author() != null && !parent.author().equals(c.author)) {
					notify(user(parent.author()), actor, "COMMENT_REPLY", service, c.days, readAt(c.days))
						.addValue("comment", id);
				}
			}
			for (Cmt reply : c.replies) {
				if (!reply.replies.isEmpty()) {
					throw new IllegalStateException("답글에는 답글을 달 수 없습니다: " + reply.key);
				}
				insertComment(s, reply, row);
			}
		}

		// ---------- 반응·이벤트 ----------

		private void insertReactions(Svc s) {
			List<String> pool = new ArrayList<>(plan.members.stream()
				.filter(m -> !m.withdraw && "ACTIVE".equals(m.status) && !isMaker(s.key, m.key))
				.map(m -> m.key).toList());
			react(s, "LIKE", s.likes, new ArrayList<>(pool));
			react(s, "SAVE", s.saves, new ArrayList<>(pool));
			if (s.likedByMe) {
				reaction(s, DemoPlan.ME, "LIKE", s.myReactionDays);
			}
			if (s.savedByMe) {
				reaction(s, DemoPlan.ME, "SAVE", s.myReactionDays);
			}
		}

		private void react(Svc s, String type, List<DemoPlan.Burst> bursts, List<String> pool) {
			java.util.Collections.shuffle(pool, random);
			for (var b : bursts) {
				if (b.count() > pool.size()) {
					throw new IllegalStateException("반응을 남길 회원이 부족합니다: " + s.key);
				}
				for (int i = 0; i < b.count(); i++) {
					reaction(s, pool.removeFirst(), type, between(b.fromDays(), b.toDays()));
				}
			}
		}

		private void reaction(Svc s, String userKey, String type, double days) {
			jdbc.sql("""
					INSERT INTO service_reactions(user_id, service_id, reaction_type, created_at)
					VALUES (:user, :service, :type, :at)
					""").param("user", user(userKey)).param("service", service(s.key)).param("type", type)
				.param("at", ts(days)).update();
		}

		private void insertEvents(Svc s) {
			List<MapSqlParameterSource> rows = new ArrayList<>();
			for (var entry : Map.of("LAUNCH", s.launches, "VIEW", s.views).entrySet()) {
				for (var b : entry.getValue()) {
					for (int i = 0; i < b.count(); i++) {
						rows.add(new MapSqlParameterSource().addValue("service", service(s.key))
							.addValue("actor", "demo:" + random.nextInt(1_000_000)).addValue("type", entry.getKey())
							.addValue("at", ts(between(b.fromDays(), b.toDays()))));
					}
				}
			}
			if (!rows.isEmpty()) {
				batch.batchUpdate("""
						INSERT INTO service_events(service_id, actor_key, event_type, is_counted, occurred_at)
						VALUES (:service, :actor, :type, true, :at)
						""", rows.toArray(MapSqlParameterSource[]::new));
			}
		}

		// ---------- 회고·초안 ----------

		/** service가 "#이름"이면 서비스가 지워진 뒤 남은 회고(서비스 연결 없음, 이름만 보존)다. */
		private void insertReflection(DemoPlan.Reflection r) {
			boolean deleted = r.service().startsWith("#");
			jdbc.sql("""
					INSERT INTO user_reflections(reflection_id, user_id, service_id, service_name, title, body, revision,
					  created_at, updated_at)
					VALUES (:id, :me, :service, :name, :title, :body, :revision, :at, :at)
					""").param("id", UUID.randomUUID()).param("me", me)
				.param("service", deleted ? null : service(r.service()))
				.param("name", deleted ? r.service().substring(1) : specs.get(r.service()).name)
				.param("title", r.title()).param("body", r.body())
				.param("revision", UUID.randomUUID()).param("at", ts(r.days())).update();
		}

		private void insertDraft() {
			if (plan.draft == null) {
				return;
			}
			jdbc.sql("""
					INSERT INTO service_registration_drafts(user_id, revision, payload, updated_at)
					VALUES (:me, :revision, CAST(:payload AS jsonb), :at)
					""").param("me", me).param("revision", UUID.randomUUID()).param("payload", plan.draft.json())
				.param("at", ts(plan.draft.days())).update();
		}

		// ---------- 신고·운영 조치 ----------

		private void moderate(Moderation m) {
			Resolved t = resolve(m.target);
			boolean handled = m.kind != Kind.PENDING && m.kind != Kind.AUTO_HIDE;
			boolean autoHidden = m.kind == Kind.AUTO_HIDE || m.kind == Kind.RESTORE
					|| (m.reports.size() >= 4 && m.kind == Kind.HIDE);
			// 4번째 신고에서 임시 비공개되고, 비공개 대상은 더 신고할 수 없으므로 정확히 4건이다
			if (autoHidden && m.reports.size() != 4) {
				throw new IllegalStateException("자동 임시 비공개 사례는 신고 4건이어야 합니다: " + m.target);
			}
			if (!autoHidden && !handled && m.reports.size() >= 4) {
				throw new IllegalStateException("처리 대기 신고 4건이면 자동 임시 비공개돼야 합니다: " + m.target);
			}
			String status = switch (m.kind) {
				case PENDING, AUTO_HIDE -> "OPEN";
				case HIDE, DELETE -> "RESOLVED";
				case DISMISS, RESTORE -> "DISMISSED";
			};
			List<Long> ids = new ArrayList<>();
			Set<String> reporters = new HashSet<>();
			for (int i = 0; i < m.reports.size(); i++) {
				var r = m.reports.get(i);
				if (!reporters.add(r.reporter())) {
					throw new IllegalStateException("같은 회원이 같은 대상을 두 번 신고했습니다: " + m.target);
				}
				ids.add(jdbc.sql("""
						INSERT INTO reports(reporter_id, target_type, target_key, target_service_id, target_review_id,
						  target_review_reply_id, target_comment_id, target_user_id, reason_code, detail, status, reviewed_by,
						  reviewed_at, resolution_note, created_at)
						VALUES (:reporter, :type, :key, :service, :review, :reply, :comment, :user, :reason, :detail, :status,
						  :reviewer, :reviewedAt, :note, :at)
						RETURNING report_id
						""").param("reporter", user(r.reporter())).param("type", t.type().name()).param("key", t.key())
					.param("service", t.type() == TargetType.SERVICE ? t.rowId() : null)
					.param("review", t.type() == TargetType.REVIEW ? t.rowId() : null)
					.param("reply", t.type() == TargetType.REVIEW_REPLY ? UUID.fromString(t.key()) : null)
					.param("comment", t.type() == TargetType.COMMENT ? t.rowId() : null)
					.param("user", t.type() == TargetType.PROFILE ? UUID.fromString(t.key()) : null)
					.param("reason", r.reason()).param("detail", r.detail()).param("status", status)
					.param("reviewer", handled ? user(m.actor) : null).param("reviewedAt", handled ? ts(m.handledDays) : null)
					.param("note", handled ? m.note : null).param("at", ts(reportDays(m, i)))
					.query(Long.class).single());
			}
			if (autoHidden) {
				double hiddenDays = reportDays(m, 3);
				visibility(t, "TEMP_HIDDEN", AUTO_HIDE_REASON);
				action(t, ids.get(3), null, "TEMP_HIDE", AUTO_HIDE_REASON, true, hiddenDays);
				hiddenNotice(t, hiddenDays);
			}
			if (!handled) {
				return;
			}
			Long basis = ids.isEmpty() ? null : ids.getFirst();
			switch (m.kind) {
				case HIDE -> {
					visibility(t, "HIDDEN", m.note);
					if (t.type() == TargetType.SERVICE) {
						for (UUID maker : t.recipients()) {
							notify(maker, null, "SERVICE_BLOCKED", t.serviceId(), m.handledDays, readAt(m.handledDays))
								.addValue("kind", "SERVICE").addValue("reason", m.note);
						}
					}
				}
				case RESTORE -> {
					visibility(t, "PUBLIC", null);
					if (t.type() == TargetType.SERVICE) {
						for (UUID maker : t.recipients()) {
							notify(maker, null, "SERVICE_UNHIDDEN", t.serviceId(), m.handledDays, readAt(m.handledDays))
								.addValue("kind", "SERVICE");
						}
					}
				}
				case DELETE -> remove(t);
				default -> { }
			}
			action(t, basis, m.actor, m.kind.name(), m.note, false, m.handledDays);
		}

		/** 신고 시각: 처음 신고부터 조금씩 간격을 둔다 */
		private double reportDays(Moderation m, int index) {
			return Math.max(m.days - index * 0.15, 0.02);
		}

		private void hiddenNotice(Resolved t, double days) {
			switch (t.type()) {
				case SERVICE -> {
					for (UUID maker : t.recipients()) {
						notify(maker, null, "SERVICE_HIDDEN", t.serviceId(), days, readAt(days)).addValue("kind", "SERVICE");
					}
				}
				case REVIEW, REVIEW_REPLY -> {
					if (t.author() != null) {
						notify(t.author(), null, "CONTENT_HIDDEN", t.serviceId(), days, readAt(days))
							.addValue("kind", t.type().name()).addValue("review", t.rowId());
					}
				}
				case COMMENT -> {
					if (t.author() != null) {
						notify(t.author(), null, "CONTENT_HIDDEN", t.serviceId(), days, readAt(days))
							.addValue("kind", "COMMENT").addValue("comment", t.rowId());
					}
				}
				case PROFILE -> notify(t.author(), null, "CONTENT_HIDDEN", null, days, readAt(days)).addValue("kind", "PROFILE");
			}
		}

		private void visibility(Resolved t, String status, String reason) {
			String sql = switch (t.type()) {
				case SERVICE -> "UPDATE services SET visibility_status = :status, hidden_reason = :reason WHERE service_id = :id";
				case REVIEW -> "UPDATE reviews SET visibility_status = :status, hidden_reason = :reason WHERE review_id = :id";
				case REVIEW_REPLY -> "UPDATE reviews SET reply_visibility_status = :status, reply_hidden_reason = :reason WHERE review_id = :id";
				case COMMENT -> "UPDATE service_comments SET visibility_status = :status, hidden_reason = :reason WHERE comment_id = :id";
				case PROFILE -> "UPDATE users SET visibility_status = :status, hidden_reason = :reason WHERE user_id = :id";
			};
			jdbc.sql(sql).param("status", status).param("reason", reason)
				.param("id", t.type() == TargetType.PROFILE ? UUID.fromString(t.key()) : t.rowId()).update();
		}

		private void remove(Resolved t) {
			switch (t.type()) {
				case REVIEW -> jdbc.sql("DELETE FROM reviews WHERE review_id = :id").param("id", t.rowId()).update();
				case REVIEW_REPLY -> jdbc.sql("""
						UPDATE reviews SET reply_id = NULL, reply_author_id = NULL, reply_content = NULL,
						  reply_visibility_status = NULL, reply_hidden_reason = NULL, reply_created_at = NULL,
						  reply_updated_at = NULL WHERE review_id = :id
						""").param("id", t.rowId()).update();
				case COMMENT -> jdbc.sql("DELETE FROM service_comments WHERE comment_id = :id").param("id", t.rowId()).update();
				default -> throw new IllegalStateException("시연 데이터는 리뷰·답글·댓글만 삭제 조치합니다: " + t.type());
			}
		}

		private void action(Resolved t, Long report, String actor, String type, String reason, boolean automatic,
				double days) {
			jdbc.sql("""
					INSERT INTO moderation_actions(target_type, target_key, report_id, actor_id, action_type, reason,
					  is_automatic, created_at)
					VALUES (:type, :key, :report, :actor, :action, :reason, :auto, :at)
					""").param("type", t.type().name()).param("key", t.key()).param("report", report)
				.param("actor", actor == null ? null : user(actor)).param("action", type).param("reason", reason)
				.param("auto", automatic).param("at", ts(days)).update();
		}

		private void sanction(DemoPlan.Sanction s) {
			UUID target = user(s.user());
			if (!"WARNING".equals(s.action())) {
				jdbc.sql("UPDATE users SET account_status = :status, restriction_reason = :reason WHERE user_id = :id")
					.param("status", s.action()).param("reason", s.reason()).param("id", target).update();
			}
			if ("REGISTRATION_RESTRICTED".equals(s.action())) {
				notify(target, null, "REGISTRATION_RESTRICTED", null, s.days(), readAt(s.days())).addValue("reason", s.reason());
			}
			jdbc.sql("""
					INSERT INTO moderation_actions(target_type, target_key, actor_id, action_type, reason, created_at)
					VALUES ('PROFILE', :key, :actor, :action, :reason, :at)
					""").param("key", target.toString()).param("actor", user(s.actor())).param("action", s.action())
				.param("reason", s.reason()).param("at", ts(s.days())).update();
		}

		private Resolved resolve(DemoPlan.Target target) {
			return switch (target.type()) {
				case SERVICE -> {
					long id = service(target.key());
					List<UUID> makers = makers(target.key(), 0).stream().map(this::user).toList();
					yield new Resolved(TargetType.SERVICE, String.valueOf(id), id, id, null, makers);
				}
				case REVIEW -> {
					ReviewRow r = review(target.key());
					yield new Resolved(TargetType.REVIEW, String.valueOf(r.id()), r.id(), service(r.service()),
							r.author() == null ? null : user(r.author()), List.of());
				}
				case REVIEW_REPLY -> {
					ReviewRow r = review(target.key());
					if (r.replyId() == null) {
						throw new IllegalStateException("답글이 없는 리뷰입니다: " + target.key());
					}
					yield new Resolved(TargetType.REVIEW_REPLY, r.replyId().toString(), r.id(), service(r.service()),
							user(r.replyAuthor()), List.of());
				}
				case COMMENT -> {
					CommentRow c = comments.get(target.key());
					if (c == null) {
						throw new IllegalStateException("없는 댓글입니다: " + target.key());
					}
					yield new Resolved(TargetType.COMMENT, String.valueOf(c.id()), c.id(), service(c.service()),
							c.author() == null ? null : user(c.author()), List.of());
				}
				case PROFILE -> {
					UUID id = user(target.key());
					yield new Resolved(TargetType.PROFILE, id.toString(), 0, null, id, List.of());
				}
			};
		}

		// ---------- 알림 ----------

		private MapSqlParameterSource notify(UUID recipient, UUID actor, String type, Long service, double days,
				Timestamp readAt) {
			var row = new MapSqlParameterSource().addValue("recipient", recipient).addValue("actor", actor)
				.addValue("type", type).addValue("service", service).addValue("at", ts(days)).addValue("read", readAt)
				.addValue("comment", null).addValue("review", null).addValue("invitation", null).addValue("kind", null)
				.addValue("reason", null);
			notifications.add(row);
			return row;
		}

		/** 이틀이 지난 알림은 읽은 것으로 둔다 */
		private Timestamp readAt(double days) {
			return days > 2 ? ts(days - 0.1) : null;
		}

		private void flushNotifications() {
			if (notifications.isEmpty()) {
				return;
			}
			batch.batchUpdate("""
					INSERT INTO notifications(recipient_id, actor_id, notification_type, target_service_id, target_comment_id,
					  target_review_id, target_invitation_id, target_kind, reason, created_at, read_at)
					VALUES (:recipient, :actor, :type, :service, :comment, :review, :invitation, :kind, :reason, :at, :read)
					""", notifications.toArray(MapSqlParameterSource[]::new));
			notifications.clear();
		}

		// ---------- 확인 ----------

		private Map<String, Object> summary() {
			Map<String, Object> result = new LinkedHashMap<>();
			for (String table : List.of("users", "services", "reviews", "review_votes", "service_comments",
					"service_reactions", "service_events", "service_invitations", "service_members", "notifications",
					"reports", "moderation_actions", "user_reflections", "service_registration_drafts")) {
				result.put(table, jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single());
			}
			result.put("본계정 알림(안 읽음)", jdbc.sql(
					"SELECT count(*) FILTER (WHERE read_at IS NULL) || ' / ' || count(*) FROM notifications WHERE recipient_id = :me")
				.param("me", me).query(String.class).single());
			result.put("공개 서비스", jdbc.sql("SELECT count(*) FROM services WHERE visibility_status = 'PUBLIC'")
				.query(Long.class).single());
			return result;
		}

		// ---------- 도우미 ----------

		private Instant at(double days) {
			return now.minusSeconds(Math.round(days * 86_400));
		}

		private Timestamp ts(double days) {
			return Timestamp.from(at(days));
		}

		private double between(double fromDays, double toDays) {
			return Math.min(fromDays, toDays) + random.nextDouble() * Math.abs(fromDays - toDays);
		}

		private UUID user(String key) {
			UUID id = users.get(key);
			if (id == null) {
				throw new IllegalStateException("없는 회원 키입니다: " + key);
			}
			return id;
		}

		private long service(String key) {
			Long id = services.get(key);
			if (id == null) {
				throw new IllegalStateException("없는 서비스 키입니다: " + key);
			}
			return id;
		}

		private ReviewRow review(String key) {
			ReviewRow row = reviews.get(key);
			if (row == null) {
				throw new IllegalStateException("없는 리뷰 키입니다: " + key);
			}
			return row;
		}

		private String image(String name) {
			if (name == null) {
				return null;
			}
			var image = uploaded.get(name);
			if (image == null) {
				throw new IllegalStateException("올리지 않은 이미지입니다: " + name);
			}
			return image.url();
		}
	}

	private record ReviewRow(long id, String service, String author, UUID replyId, String replyAuthor) {
	}

	private record CommentRow(long id, String service, String author) {
	}

	/** 신고 대상의 저장 키(target_key)·행 ID·소속 서비스·작성자(알림 받는 사람) */
	private record Resolved(TargetType type, String key, long rowId, Long serviceId, UUID author,
			List<UUID> recipients) {
	}
}

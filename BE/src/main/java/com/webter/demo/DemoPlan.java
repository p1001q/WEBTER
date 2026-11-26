package com.webter.demo;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 시연 데이터의 구성. 시각은 모두 "실행 시각으로부터 며칠 전"(소수 가능)으로 적는다.
 * 회원·서비스·리뷰·댓글은 키로 서로를 가리키고, {@link DemoSeeder}가 실제 ID로 바꿔 저장한다.
 */
final class DemoPlan {

	/** 본계정(실제 회원)을 가리키는 키. 시드가 만들지 않고 이메일로 찾는다. */
	static final String ME = "me";

	final List<Member> members = new ArrayList<>();
	final List<Svc> services = new ArrayList<>();
	final List<Invite> invites = new ArrayList<>();
	final List<Moderation> moderations = new ArrayList<>();
	final List<Sanction> sanctions = new ArrayList<>();
	final List<Reflection> reflections = new ArrayList<>();
	/** 평가만 남기는 회원(목록에 보이지 않고 집계에만 들어간다) */
	final List<String> raters = new ArrayList<>();
	Draft draft;

	Member member(String key, String username, String nickname) {
		Member m = new Member(key, username, nickname);
		members.add(m);
		return m;
	}

	Svc service(String key, String owner, String name, String tagline) {
		Svc s = new Svc(key, owner, name, tagline);
		services.add(s);
		return s;
	}

	void invite(String service, String inviter, String invitee, String status, double days, double respondedDays) {
		invites.add(new Invite(service, inviter, invitee, status, days, respondedDays));
	}

	Moderation moderate(Kind kind, Target target, double days) {
		Moderation m = new Moderation(kind, target, days);
		moderations.add(m);
		return m;
	}

	void sanction(String user, String action, String actor, String reason, double days) {
		sanctions.add(new Sanction(user, action, actor, reason, days));
	}

	static final class Member {
		final String key;
		final String username;
		final String nickname;
		String bio;
		String avatar;
		final Map<String, String> links = new LinkedHashMap<>();
		final List<String> interests = new ArrayList<>();
		String role = "USER";
		String status = "ACTIVE";
		String restriction;
		String visibility = "PUBLIC";
		String hiddenReason;
		double joinedDays = 120;
		/** 데이터를 모두 만든 뒤 실제 탈퇴 처리로 지운다 */
		boolean withdraw;

		Member(String key, String username, String nickname) {
			this.key = key;
			this.username = username;
			this.nickname = nickname;
		}

		Member bio(String bio) { this.bio = bio; return this; }
		Member avatar(String image) { this.avatar = image; return this; }
		Member link(String kind, String url) { links.put(kind, url); return this; }
		Member interests(String... codes) { interests.addAll(List.of(codes)); return this; }
		Member admin() { role = "ADMIN"; return this; }
		Member joined(double days) { joinedDays = days; return this; }
		Member withdraw() { withdraw = true; return this; }
	}

	static final class Svc {
		final String key;
		final String owner;
		final String name;
		final String tagline;
		String description;
		String slug;
		String github;
		String project = "SIDE";
		String price = "FREE";
		String team;
		List<String> devices = List.of("PC", "MOBILE");
		List<String> langs = List.of("KO");
		List<String> cats = List.of();
		List<String> tags = List.of();
		String icon;
		String thumb;
		List<String> previews = List.of();
		String ratio = "16:9";
		String fit = "COVER";
		boolean guest;
		boolean anonReview;
		boolean anonComment;
		String unavailable;
		String visibility = "PUBLIC";
		String hiddenReason;
		double createdDays = 30;
		final List<Version> versions = new ArrayList<>();
		final List<Rev> reviews = new ArrayList<>();
		final List<Cmt> comments = new ArrayList<>();
		final List<Rating> ratings = new ArrayList<>();
		final List<Burst> launches = new ArrayList<>();
		final List<Burst> views = new ArrayList<>();
		final List<Burst> likes = new ArrayList<>();
		final List<Burst> saves = new ArrayList<>();
		boolean likedByMe;
		boolean savedByMe;
		double myReactionDays = 3;

		Svc(String key, String owner, String name, String tagline) {
			this.key = key;
			this.owner = owner;
			this.name = name;
			this.tagline = tagline;
			this.slug = key;
		}

		Svc desc(String markdown) { description = markdown; return this; }
		Svc github(String url) { github = url; return this; }
		Svc type(String projectType) { project = projectType; return this; }
		Svc price(String priceType) { price = priceType; return this; }
		Svc team(String name) { team = name; return this; }
		Svc devices(String... codes) { devices = List.of(codes); return this; }
		Svc langs(String... codes) { langs = List.of(codes); return this; }
		Svc cats(String... codes) { cats = List.of(codes); return this; }
		Svc tags(String... names) { tags = List.of(names); return this; }
		Svc icon(String image) { icon = image; return this; }
		Svc thumb(String image) { thumb = image; return this; }
		Svc previews(String... images) { previews = List.of(images); return this; }
		Svc portrait() { ratio = "9:16"; return this; }
		Svc contain() { fit = "CONTAIN"; return this; }
		Svc allow(boolean guestReviews, boolean anonymousReviews, boolean anonymousComments) {
			guest = guestReviews;
			anonReview = anonymousReviews;
			anonComment = anonymousComments;
			return this;
		}
		Svc stopped(String reason) { unavailable = reason; return this; }
		Svc created(double days) { createdDays = days; return this; }
		Svc version(String version, String title, String content, double days) {
			versions.add(new Version(version, title, content, days));
			return this;
		}
		Rev review(String key, String author, String rate, String text, double days) {
			Rev r = new Rev(key, author, rate, text, days);
			reviews.add(r);
			return r;
		}
		Cmt comment(String key, String author, String text, double days) {
			Cmt c = new Cmt(key, author, text, days);
			comments.add(c);
			return c;
		}
		Svc ratings(int up, int down, double fromDays, double toDays) {
			ratings.add(new Rating(up, down, fromDays, toDays));
			return this;
		}
		Svc launches(int count, double fromDays, double toDays) { launches.add(new Burst(count, fromDays, toDays)); return this; }
		Svc views(int count, double fromDays, double toDays) { views.add(new Burst(count, fromDays, toDays)); return this; }
		Svc likes(int count, double fromDays, double toDays) { likes.add(new Burst(count, fromDays, toDays)); return this; }
		Svc saves(int count, double fromDays, double toDays) { saves.add(new Burst(count, fromDays, toDays)); return this; }
		Svc mine(boolean like, boolean save) { likedByMe = like; savedByMe = save; return this; }
		Svc reacted(double days) { myReactionDays = days; return this; }
	}

	record Version(String version, String title, String content, double days) {
	}

	/** 일정 기간에 고르게 흩어 만들 건수 */
	record Burst(int count, double fromDays, double toDays) {
	}

	record Rating(int up, int down, double fromDays, double toDays) {
	}

	static final class Rev {
		final String key;
		/** 회원 키, 또는 비회원이면 "guest" */
		final String author;
		/** UP·DOWN·NONE */
		final String rate;
		final String text;
		final double days;
		boolean anonymous;
		String guestIp;
		Double editedDays;
		String replyAuthor;
		String replyText;
		double replyDays;
		Double replyEditedDays;
		final List<String> up = new ArrayList<>();
		final List<String> down = new ArrayList<>();

		Rev(String key, String author, String rate, String text, double days) {
			this.key = key;
			this.author = author;
			this.rate = rate;
			this.text = text;
			this.days = days;
		}

		Rev anonymous() { anonymous = true; return this; }
		Rev guestIp(String ip) { guestIp = ip; return this; }
		Rev edited(double days) { editedDays = days; return this; }
		Rev reply(String author, String text, double days) {
			replyAuthor = author;
			replyText = text;
			replyDays = days;
			return this;
		}
		Rev replyEdited(double days) { replyEditedDays = days; return this; }
		Rev up(String... users) { up.addAll(List.of(users)); return this; }
		Rev down(String... users) { down.addAll(List.of(users)); return this; }
	}

	static final class Cmt {
		final String key;
		final String author;
		final String text;
		final double days;
		boolean anonymous;
		Double editedDays;
		/** 답글이 남은 채 지운 댓글(작성자·내용 없이 자리만 남는다) */
		boolean deleted;
		final List<Cmt> replies = new ArrayList<>();

		Cmt(String key, String author, String text, double days) {
			this.key = key;
			this.author = author;
			this.text = text;
			this.days = days;
		}

		Cmt anonymous() { anonymous = true; return this; }
		Cmt edited(double days) { editedDays = days; return this; }
		Cmt deleted() { deleted = true; return this; }
		Cmt reply(String key, String author, String text, double days) {
			Cmt c = new Cmt(key, author, text, days);
			replies.add(c);
			return c;
		}
		/** 답글을 달고 이 댓글로 돌아온다 */
		Cmt with(String key, String author, String text, double days) {
			reply(key, author, text, days);
			return this;
		}
	}

	record Invite(String service, String inviter, String invitee, String status, double days, double respondedDays) {
	}

	enum TargetType { SERVICE, REVIEW, REVIEW_REPLY, COMMENT, PROFILE }

	/** 신고·조치 대상. key는 서비스·리뷰(답글은 그 리뷰)·댓글·회원 키다. */
	record Target(TargetType type, String key) {
		static Target service(String key) { return new Target(TargetType.SERVICE, key); }
		static Target review(String key) { return new Target(TargetType.REVIEW, key); }
		static Target reply(String reviewKey) { return new Target(TargetType.REVIEW_REPLY, reviewKey); }
		static Target comment(String key) { return new Target(TargetType.COMMENT, key); }
		static Target profile(String key) { return new Target(TargetType.PROFILE, key); }
	}

	/**
	 * PENDING: 처리 대기. AUTO_HIDE: 신고 누적 자동 임시 비공개(처리 대기 유지).
	 * HIDE·DELETE·DISMISS: 운영자 처리 완료. RESTORE: 자동 임시 비공개 뒤 운영자가 복구.
	 */
	enum Kind { PENDING, AUTO_HIDE, HIDE, DELETE, DISMISS, RESTORE }

	static final class Moderation {
		final Kind kind;
		final Target target;
		final double days;
		final List<ReportBy> reports = new ArrayList<>();
		String actor;
		String note;
		double handledDays;

		Moderation(Kind kind, Target target, double days) {
			this.kind = kind;
			this.target = target;
			this.days = days;
		}

		Moderation report(String reporter, String reason, String detail) {
			reports.add(new ReportBy(reporter, reason, detail));
			return this;
		}
		Moderation handled(String actor, String note, double days) {
			this.actor = actor;
			this.note = note;
			this.handledDays = days;
			return this;
		}
	}

	record ReportBy(String reporter, String reason, String detail) {
	}

	record Sanction(String user, String action, String actor, String reason, double days) {
	}

	record Reflection(String service, String title, String body, double days) {
	}

	record Draft(String json, double days) {
	}
}

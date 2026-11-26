package com.webter.demo;

import static com.webter.demo.DemoPlan.ME;

import com.webter.demo.DemoPlan.Kind;
import com.webter.demo.DemoPlan.Svc;
import com.webter.demo.DemoPlan.Target;

/**
 * 시연 데이터 내용. 서비스 이름 앞의 [시연]은 발표 중 기능을 바로 찾기 위한 안내용 데이터다.
 * 사례 ID(U·S·V·P·I·R·C·A·M·T·O)는 이슈 #72의 사례 구성표와 같다.
 */
final class DemoContent {

	private DemoContent() {
	}

	private static final String GITHUB = "https://github.com/p1001q";

	static DemoPlan plan() {
		DemoPlan p = new DemoPlan();
		members(p);
		meServices(p);
		teamServices(p);
		naturalServices(p);
		guideServices(p);
		moderation(p);
		reflections(p);
		return p;
	}

	// ---------------------------------------------------------------- 회원 (U)

	private static final String[] RATER_NAMES = { "초코칩", "산책러", "밤하늘", "고등어", "토마토", "해바라기", "레몬티", "감자칩",
			"구름빵", "모래시계", "파도소리", "새싹", "별똥별", "호두", "단풍잎", "눈사람", "다람쥐", "귤껍질", "솜사탕", "연필깎이", "체리",
			"바닐라", "소나무", "고양이손", "만두" };

	private static void members(DemoPlan p) {
		p.member("adm2", "webter.ops", "운영지기").admin().joined(200);
		p.member("a", "dawn.code", "새벽코딩").avatar("avatar-1").joined(180)
			.bio("퇴근 후 작은 도구를 만드는 사이드 프로젝트 러버")
			.link("github", "https://github.com/p1001q").link("velog", "https://velog.io/@p1001q/posts")
			.link("instagram", "https://www.instagram.com/p.1o0l/").link("tistory", "https://p1001q.tistory.com/")
			.interests("PRODUCTIVITY", "DEV_TOOLS", "LIFE");
		p.member("b", "jiwoo.dev", "지우").joined(160).bio("모바일 웹을 좋아하는 프론트엔드 개발자")
			.link("naver_blog", "https://blog.naver.com/tndussy123").interests("LIFE", "PLAY");
		p.member("c", "review.cat", "리뷰하는고양이").avatar("avatar-2").joined(150).interests("PLAY");
		p.member("d", "mint.byte", "민트바이트").joined(90).interests("DESIGN");
		p.member("e", "sol.maker", "솔메이커").avatar("avatar-3").joined(140).bio("요리와 식물을 좋아하는 메이커")
			.link("instagram", "https://www.instagram.com/p.1o0l/").interests("LIFE", "DESIGN");
		p.member("f", "pixel.han", "픽셀한").avatar("avatar-4").joined(130).bio("도트 그림과 디자인 도구를 만들어요")
			.link("github", "https://github.com/p1001q").interests("DESIGN", "PLAY", "DEV_TOOLS");
		p.member("g", "studyroom", "공부방장").joined(125).bio("같이 공부하는 서비스를 만듭니다")
			.link("velog", "https://velog.io/@p1001q/posts").interests("LEARNING");
		p.member("h", "plan.b", "플랜비").joined(120).interests("UTILITY", "PRODUCTIVITY");
		p.member("j", "cozy.lab", "코지랩").avatar("avatar-5").joined(110).bio("세 명이 함께 만드는 작은 팀")
			.link("tistory", "https://p1001q.tistory.com/").link("naver_blog", "https://blog.naver.com/tndussy123")
			.interests("PRODUCTIVITY", "DESIGN");
		p.member("k", "hello.world", "헬로월드").avatar("avatar-6").joined(100).interests("PLAY", "UTILITY");
		p.member("l", "night.owl", "올빼미").joined(95).interests("PLAY", "LEARNING");
		p.member("n", "bori.dev", "보리").joined(85).interests("LIFE");
		p.member("w", "goodbye.w", "떠날사람").joined(100).withdraw();
		p.member("w2", "leaving.dev", "출석팀장").joined(95).withdraw();
		p.member("ph", "hidden.nick", "부적절한닉").joined(70);
		p.member("pt", "temp.hidden", "임시숨김").joined(60).bio("신고가 누적되어 임시 비공개된 프로필(시연용)");
		p.member("sw", "warn.user", "경고받음").joined(80);
		p.member("sr", "restricted.user", "등록제한").joined(75);
		p.member("ss", "suspended.user", "활동정지").joined(65);
		p.member("sx", "promo.bot", "홍보계정").joined(30).bio("최저가 쇼핑 정보 매일 공유합니다");
		for (int i = 0; i < RATER_NAMES.length; i++) {
			String key = "r%02d".formatted(i + 1);
			p.member(key, "rater%02d".formatted(i + 1), RATER_NAMES[i]).joined(100 - i * 2);
			p.raters.add(key);
		}
	}

	// ---------------------------------------------------------------- 본계정 서비스 (V1·V2·V4·V6·V7, M)

	private static void meServices(DemoPlan p) {
		Svc habit = p.service("habit", ME, "하루콩", "체크 한 번으로 쌓는 하루 습관 기록")
			.team("콩팀").cats("LIFE", "PRODUCTIVITY").tags("습관", "루틴", "자기계발").github(GITHUB)
			.icon("icon-habit").thumb("habit-1").previews("habit-1", "habit-2", "habit-3")
			.allow(true, true, true).created(75)
			.desc("""
					## 하루콩은
					매일 지키고 싶은 습관을 **체크 한 번**으로 기록하는 서비스예요.

					- 요일별 체크와 연속 달성 기록
					- 친구와 함께 보는 달성 랭킹
					- 월간 달성률 통계

					> 작은 습관이 모여 큰 하루가 돼요.
					""")
			.version("1.0.0", "첫 공개", "습관 체크와 연속 달성 기록을 열었어요.", 70)
			.version("1.1.0", "친구 랭킹", "친구를 초대해 달성 랭킹을 함께 볼 수 있어요.", 40)
			.version("1.2.0", "월간 통계", "한 달 달성률과 지난달 비교를 추가했어요.", 12)
			.likes(18, 1, 70).saves(6, 2, 60).launches(90, 1, 60).views(420, 0.1, 74).mine(false, false);
		habit.review("h1", "c", "UP", "매일 아침 체크하는 재미가 있어요. 연속 달성 숫자가 올라가니 그만두기 아깝네요.", 40)
			.reply(ME, "꾸준히 써 주셔서 감사해요! 다음 업데이트에 주간 리포트를 넣을 예정이에요.", 39).up("l", "n", "r01", "r02");
		habit.review("h2", "l", "UP", "친구 랭킹 생기고 나서 동기부여가 확 됐어요.", 20).anonymous().up("c");
		habit.review("h3", "guest", "NONE", "비회원인데도 리뷰를 남길 수 있어서 좋네요. 화면이 깔끔해요.", 15).guestIp("203.0.113.24");
		habit.review("h4", "n", "DOWN", "알림 시간을 직접 정할 수 있으면 좋겠어요. 지금은 아침 9시 고정이라 아쉬워요.", 9).edited(8)
			.reply("a", "의견 감사합니다! 알림 시간 설정은 다음 버전에서 열어 둘게요.", 7).replyEdited(6.5).up("c").down("r03");
		habit.review("h5", "a", "NONE", "팀원으로 참여 중이에요. 습관 카드 디자인을 맡았습니다.", 30);
		habit.review("h6", "r16", "UP", "어제부터 쓰기 시작했는데 벌써 습관이 될 것 같아요.", 0.4);
		habit.ratings(10, 1, 2, 60);
		habit.comment("hc1", "b", "다크 모드도 계획 있나요?", 25)
			.with("hc1r1", ME, "네! 다음 달에 들어갈 예정이에요.", 24)
			.with("hc1r2", "b", "기대할게요 :)", 23.5);
		habit.comment("hc2", "k", "습관은 몇 개까지 만들 수 있나요?", 12).anonymous()
			.with("hc2r1", "a", "지금은 10개까지 만들 수 있어요.", 11.5);
		habit.comment("hc3", ME, "1.2 버전에서 월간 통계가 추가됐어요. 써 보시고 의견 남겨 주세요!", 11);
		habit.comment("hc4", "r17", "친구 초대 링크는 어디서 만드나요?", 0.8);

		Svc memo = p.service("memo", ME, "메모 한 줄", "떠오른 생각을 한 줄로 빠르게 남기는 메모장")
			.type("TOY").devices("PC").cats("PRODUCTIVITY").tags("메모", "생산성").created(50)
			.likes(4, 2, 45).launches(12, 1, 45).views(90, 0.5, 48);
		memo.review("m1", "b", "UP", "가볍게 쓰기 좋아요. 열자마자 바로 입력할 수 있는 게 장점이에요.", 30);
		memo.review("m2", "k", "UP", "단축키 지원이 편해요.", 10).edited(9);
		memo.comment("mc1", "c", "모바일에서도 쓸 수 있으면 좋겠어요.", 20)
			.with("mc1r1", ME, "모바일 화면은 준비 중이에요!", 19);
		memo.comment("mc2", "n", "메모 내보내기 기능이 있으면 좋겠어요.", 1.2);

		p.service("weather", ME, "주말 날씨 요약", "이번 주말 날씨를 한 문장으로 알려 줘요")
			.cats("LIFE", "UTILITY").tags("날씨").icon("icon-weather").created(45)
			.stopped("날씨 API를 바꾸는 중이에요. 12월 초에 다시 열어요.")
			.launches(20, 30, 44).views(120, 1, 44).likes(3, 20, 40)
			.review("we1", "l", "UP", "주말 계획 세울 때 유용했어요. 다시 열리면 좋겠어요.", 40);

		p.service("focus", ME, "모각코 타이머", "함께 집중하는 50분 모각코 타이머").cats("PRODUCTIVITY").created(25)
			.launches(15, 3, 24).views(80, 2, 24);

		p.service("lunch", ME, "랜덤 점심 룰렛", "오늘 점심 메뉴를 룰렛으로 골라 드려요").type("TOY").cats("PLAY", "LIFE")
			.icon("icon-lunch").created(35).launches(10, 8, 34).views(60, 7, 34);

		Svc diary = p.service("diary", ME, "색깔 일기", "오늘의 기분을 색 하나로 기록하는 일기장")
			.cats("LIFE", "DESIGN").tags("일기", "감정").icon("icon-diary").created(60)
			.likes(6, 5, 55).launches(25, 1, 55).views(150, 0.5, 58);
		diary.review("d1", "e", "UP", "말로 하기 어려운 날도 색으로 남길 수 있어서 좋아요.", 22)
			.reply(ME, "따뜻한 리뷰 감사해요!", 21.5);
		diary.review("d2", "r18", "UP", "한 달을 모아 보면 색 달력이 예뻐요.", 5);
	}

	// ---------------------------------------------------------------- 팀 (V3·V9, T)

	private static void teamServices(DemoPlan p) {
		p.invite("habit", ME, "a", "ACCEPTED", 72, 71);
		p.invite("habit", ME, "e", "DECLINED", 20, 19);
		p.invite("habit", ME, "d", "PENDING", 1.5, 0);

		Svc walk = p.service("walk", "b", "동네 산책 지도", "우리 동네 산책 코스를 기록하고 공유해요")
			.team("산책클럽").cats("LIFE", "PLAY").tags("산책", "지도", "동네").icon("icon-walk").thumb("walk-1")
			.previews("walk-1", "walk-2").allow(false, true, false).created(55)
			.likes(9, 2, 50).saves(2, 5, 40).launches(40, 1, 50).views(260, 0.2, 54).mine(true, false);
		p.invite("walk", "b", ME, "ACCEPTED", 50, 49);
		walk.review("w1", "c", "UP", "점심시간마다 새로운 코스를 찾는 재미가 있어요.", 30)
			.reply(ME, "산책 코스 추천 감사해요! 강변 코스도 곧 올릴게요.", 29);
		walk.review("w2", "l", "DOWN", "지도 불러오는 속도가 조금 느려요.", 10).anonymous();
		walk.ratings(3, 0, 5, 45);
		walk.comment("wc1", "n", "강변 코스 최고예요.", 8);

		Svc planner = p.service("planner", "j", "코지 플래너", "주간 계획과 회고를 한 화면에서 정리하는 플래너")
			.team("코지랩").type("COMMERCIAL").price("FREEMIUM").cats("PRODUCTIVITY").tags("플래너", "회고", "생산성")
			.icon("icon-planner").created(40).launches(30, 1, 38).views(180, 0.3, 39).likes(7, 1, 38)
			.version("0.9.0", "베타 공개", "주간 계획 보드를 먼저 열었어요.", 38)
			.version("1.0.0", "정식 공개", "회고 템플릿과 팀 공유를 추가했어요.", 10);
		p.invite("planner", "j", "k", "ACCEPTED", 38, 37);
		p.invite("planner", "j", ME, "PENDING", 1, 0);
		planner.review("pl1", "l", "UP", "주간 회고 템플릿이 깔끔해서 매주 쓰고 있어요.", 15);
		planner.review("pl2", "c", "DOWN", "무료 버전은 보드가 3개까지라 아쉬워요.", 6);
		planner.ratings(2, 1, 3, 30);

		Svc study = p.service("study", "w2", "스터디 출석부", "스터디 출석과 과제를 한 번에 체크")
			.team("출석팀").type("TOY").devices("MOBILE").cats("LEARNING").tags("스터디", "출석")
			.icon("icon-study").previews("study-1", "study-2").portrait().created(65)
			.launches(25, 5, 60).views(140, 1, 62).likes(5, 5, 60);
		p.invite("study", "w2", "k", "ACCEPTED", 60, 59);
		p.invite("study", "w2", "g", "ACCEPTED", 58, 57);
		study.review("s1", "l", "UP", "출석 체크 알림 덕분에 스터디가 꾸준해졌어요.", 50)
			.reply("w2", "감사합니다! 스터디 운영에 도움이 되면 좋겠어요.", 49);
		study.review("s2", "c", "UP", "결석한 사람만 모아 보는 기능이 편해요.", 30)
			.reply("k", "다음 업데이트에서 과제 제출 기능도 넣을게요.", 29);
	}

	// ---------------------------------------------------------------- 실제 서비스형 기본 데이터 (S, I, R, C, A)

	private static final String[] JSON_REVIEWS = { "들여쓰기가 깔끔하게 맞춰져서 매일 써요.", "API 응답 확인할 때 필수 도구가 됐어요.",
			"오류 위치를 줄 번호로 알려 줘서 좋아요.", "다크 모드가 눈이 편해요.", "큰 JSON도 버벅이지 않아요.", "키 정렬 옵션이 생각보다 유용해요.",
			"광고가 없어서 좋아요.", "복사 버튼 위치가 조금 애매해요.", "트리 보기로 접었다 펼 수 있어서 편해요.", "설치 없이 바로 쓰는 게 최고예요.",
			"한글이 깨지지 않아요.", "주석이 있으면 오류로 처리돼서 아쉬워요.", "모바일에서도 잘 보여요.", "압축 기능도 같이 있어서 좋아요.",
			"YAML 변환도 지원하면 좋겠어요.", "회사에서도 팀원들이 다 써요.", "단축키가 직관적이에요.", "가끔 붙여넣기가 느려요.",
			"오류 메시지가 친절해요.", "북마크해 두고 씁니다.", "파일 업로드로도 열 수 있어서 편해요.", "빈 값 강조 표시가 유용해요.",
			"탭 크기를 고를 수 있으면 좋겠어요.", "깔끔하고 빨라요." };

	private static final String[] JSON_COMMENTS = { "JSON5도 지원하나요?", "공유 링크 기능 생기면 좋겠어요.", "정렬 기준을 바꿀 수 있나요?",
			"오프라인에서도 되나요?", "결과를 파일로 저장할 수 있으면 좋겠어요.", "글꼴 크기 조절 기능 요청해요.", "이거 오픈소스인가요?",
			"키 검색 기능도 생기면 좋겠어요.", "회사 보안망에서도 잘 돼요.", "다른 포맷 변환기도 만들어 주세요.", "빈 배열 표시가 깔끔해요.",
			"정말 매일 씁니다.", "API 테스트할 때 같이 쓰기 좋아요.", "확장 프로그램도 있나요?", "속도가 빨라졌네요.",
			"줄 번호 복사가 되면 좋겠어요.", "유니코드 이스케이프도 풀어 주나요?", "결과 화면 폭을 넓힐 수 있나요?", "다크 모드 색이 예뻐요.",
			"모바일 키보드에서 붙여넣기가 잘 돼요." };

	private static void naturalServices(DemoPlan p) {
		// R14·C2: 리뷰·댓글이 20개를 넘어 "더 보기"가 생기는 서비스, A3: 전체 기간 인기 1위
		Svc json = p.service("json", "a", "JSON 정리기", "붙여 넣기만 하면 JSON을 보기 좋게 정리해요")
			.type("TOY").devices("PC").langs("KO", "EN").cats("DEV_TOOLS", "UTILITY").tags("JSON", "개발도구", "포매터")
			.github(GITHUB).icon("icon-json").created(90)
			.desc("""
					## 기능
					- 들여쓰기 정리·압축
					- 오류 위치 표시
					- 트리 보기

					브라우저 안에서만 처리하고 입력 내용을 서버에 보내지 않아요.
					""")
			.likes(25, 30, 88).saves(8, 40, 85).launches(260, 35, 88).views(900, 0.2, 89).mine(true, true);
		for (int i = 0; i < JSON_REVIEWS.length; i++) {
			String author = "r%02d".formatted(i + 1);
			boolean down = i == 7 || i == 11 || i == 14 || i == 17 || i == 22;
			var r = json.review("j%02d".formatted(i + 1), author, down ? "DOWN" : "UP", JSON_REVIEWS[i], 85 - i * 3.3);
			if (i == 0) {
				r.up("c", "l", "n", "b", "e", "r25").reply("a", "첫 리뷰 감사해요!", 84);
			}
			else if (i == 4) {
				r.up("c", "l", "n");
			}
			else if (i == 9) {
				r.up("l").down("n");
			}
		}
		for (int i = 0; i < JSON_COMMENTS.length; i++) {
			var c = json.comment("jc%02d".formatted(i + 1), "r%02d".formatted(25 - i), JSON_COMMENTS[i], 80 - i * 3.8);
			if (i == 0) {
				c.with("jc01r1", "a", "아직은 표준 JSON만 지원해요.", 79).with("jc01r2", "r10", "답변 감사해요!", 78);
			}
			if (i == 6) {
				c.with("jc07r1", "a", "아직은 비공개 저장소예요.", 50);
			}
		}
		json.comment("jcme", ME, "들여쓰기 칸 수도 고를 수 있나요?", 6)
			.with("jcmer1", "a", "2칸·4칸·탭 중에 고를 수 있게 업데이트했어요!", 1.5);
		json.comment("jcdel", "sw", "제 블로그에서 더 좋은 도구를 소개해요. 프로필 링크 확인!", 3);
		json.comment("jcph", "ph", "탭 크기 4칸으로 바꾸는 법 알려 주세요.", 4);

		// A3: 트렌딩(최근 3일) 1위
		Svc pomodoro = p.service("pomodoro", "a", "포모도로 메이트", "25분 집중, 5분 휴식을 친구와 함께")
			.cats("PRODUCTIVITY").tags("집중", "타이머", "공부").icon("icon-timer").created(20)
			.likes(12, 0.2, 18).saves(5, 0.1, 2.8).launches(70, 0.05, 2.8).launches(10, 4, 18).views(500, 0, 19)
			.mine(true, false);
		pomodoro.review("po1", "l", "UP", "친구랑 같이 타이머를 맞추니까 공부가 잘 돼요.", 2);
		pomodoro.review("po2", "n", "UP", "알림 소리가 부드러워서 좋아요.", 1);
		pomodoro.review("po3", "c", "UP", "휴식 시간에 스트레칭 안내가 나와서 좋아요.", 0.5);

		// R3 복합적(5~19개), I3 썸네일 + 미리보기 1장
		Svc words = p.service("words", "g", "모두의 단어장", "함께 만드는 시험 단어장과 암기 카드")
			.langs("KO", "EN").cats("LEARNING").tags("영어", "단어", "토익").icon("icon-word").thumb("square-word")
			.previews("word-1").allow(true, false, true).created(48)
			.likes(10, 3, 45).launches(35, 2, 45).views(230, 0.5, 47);
		words.review("wo1", "c", "UP", "카드 넘기는 방식이 손에 익으니 빨라요.", 30)
			.reply("g", "단어 묶음도 계속 늘려 갈게요.", 29);
		words.review("wo2", "l", "DOWN", "예문이 조금 더 많았으면 좋겠어요.", 20);
		words.review("wo3", "guest", "NONE", "가입 없이 써 봤는데 괜찮네요.", 12).guestIp("198.51.100.7");
		words.ratings(2, 2, 3, 40);
		words.comment("woc1", "n", "단어 발음도 들을 수 있나요?", 7).anonymous();

		// A3: 주간 1위
		Svc budget = p.service("budget", "h", "가계부 한 장", "한 달 수입과 지출을 한 장으로 정리해요")
			.price("FREEMIUM").cats("LIFE").tags("가계부", "절약", "자취").icon("icon-budget").thumb("budget-1")
			.previews("budget-1", "budget-2").created(33)
			.likes(14, 3.5, 30).saves(3, 4, 6.5).launches(130, 3.5, 6.5).launches(8, 10, 30).views(600, 0.5, 32)
			.mine(false, true);
		budget.review("bu1", "c", "UP", "카테고리별 그래프가 한눈에 보여서 좋아요.", 6).up("l", "n");
		budget.review("bu2", "r14", "DOWN", "더 좋은 가계부 앱 할인 쿠폰을 받아 가세요. 프로필 참고!", 5);
		budget.review("bu3", "n", "UP", "자취 시작하고 처음으로 가계부를 꾸준히 쓰고 있어요.", 4.5);
		budget.comment("buc1", "l", "카드 내역 자동 불러오기도 되나요?", 5)
			.with("buc1r1", "h", "지금은 직접 입력만 가능해요. 다음 버전에서 검토할게요.", 4.8);

		// A3: 월간 1위, I7 세로 원본 + 9:16 COVER(자연스러운 사례)
		Svc recipe = p.service("recipe", "e", "냠냠 레시피", "냉장고 재료로 만드는 자취생 10분 레시피")
			.devices("MOBILE").cats("LIFE").tags("요리", "레시피", "자취").icon("icon-recipe").thumb("recipe-1")
			.previews("recipe-1", "recipe-2", "recipe-3").portrait().allow(true, true, true).created(45)
			.likes(20, 8, 40).saves(6, 9, 27).launches(170, 8, 27).views(800, 0.3, 44).mine(true, true);
		recipe.review("re1", "c", "UP", "냉장고 재료만 고르면 레시피가 나와서 편해요.", 20)
			.reply("e", "자주 쓰는 재료를 더 늘려 볼게요!", 19.5);
		recipe.review("re2", "l", "UP", "사진이 먹음직스러워요.", 15).anonymous();
		recipe.review("re3", "guest", "NONE", "김치볶음밥 레시피 따라 했는데 맛있었어요.", 11).guestIp("203.0.113.88");
		recipe.review("re4", "n", "UP", "조리 시간이 짧은 순으로 볼 수 있어서 좋아요.", 9)
			.reply("e", "감사합니다. 1인분 기준 레시피도 더 올릴게요.", 8.5);
		recipe.comment("rec1", "b", "채식 레시피도 있나요?", 14).with("rec1r1", "e", "채식 필터를 준비하고 있어요.", 13.5);

		// I5 16:9 COVER 가로 원본
		Svc pixel = p.service("pixel", "f", "픽셀 캔버스", "브라우저에서 바로 그리는 16x16 도트 그림판")
			.type("SIDE").devices("PC").cats("DESIGN", "PLAY").tags("도트", "픽셀아트", "그림").icon("icon-pixel")
			.thumb("pixel-1").previews("pixel-1", "pixel-2", "pixel-3").created(70)
			.likes(16, 5, 65).saves(4, 10, 60).launches(60, 2, 65).views(380, 0.5, 69).mine(true, false);
		pixel.review("pi1", "c", "UP", "색 고르는 팔레트가 예뻐요.", 40);
		pixel.review("pi2", "r11", "DOWN", "이 그림판 쓰지 마세요. 제 사이트가 훨씬 좋아요.", 6);
		pixel.review("pi3", "l", "UP", "레이어 기능까지 있어서 놀랐어요.", 25).up("c");
		pixel.ratings(3, 0, 10, 60);

		p.service("palette", "j", "팔레트 픽커", "사진에서 어울리는 색 다섯 개를 뽑아 줘요")
			.cats("DESIGN").tags("색상", "디자인").icon("icon-palette").thumb("square-palette").previews("palette-1")
			.created(28).likes(6, 2, 25).launches(30, 1, 26).views(160, 0.5, 27);

		p.service("plant", "e", "물주기 알림", "반려식물 물 주는 날을 놓치지 않게 알려 줘요")
			.devices("MOBILE").cats("LIFE").tags("식물", "알림").icon("icon-plant").previews("plant-1", "plant-2")
			.portrait().created(26).likes(8, 2, 24).launches(25, 1, 24).views(140, 0.3, 25)
			.review("pla1", "n", "UP", "몬스테라 살렸어요. 알림이 딱 맞춰 와요.", 10);

		Svc typing = p.service("typing", "k", "헬로 타자 연습", "짧은 문장으로 하는 한글·영문 타자 연습")
			.devices("PC").langs("KO", "EN").cats("LEARNING", "PLAY").tags("타자", "연습").icon("icon-type").created(58)
			.likes(5, 10, 55).launches(30, 5, 55).views(170, 1, 57);
		typing.comment("tyc1", "r15", "이 게임 만든 사람 손가락이 느린가 봐요 ㅋㅋ", 9);
		typing.comment("tyc2", "c", "영문 문장도 더 있으면 좋겠어요.", 7);

		// R3 부정적(5~19개)
		Svc balance = p.service("balance", "b", "밸런스 게임", "둘 중 하나만 고르는 밸런스 게임 모음")
			.type("TOY").devices("MOBILE").cats("PLAY").tags("게임", "밸런스게임").created(38)
			.launches(20, 3, 35).views(150, 1, 37).likes(3, 5, 30);
		balance.review("ba1", "c", "DOWN", "질문이 금방 반복돼요.", 20);
		balance.review("ba2", "l", "DOWN", "결과 화면이 너무 단순해요.", 14);
		balance.ratings(1, 5, 3, 30);
		balance.comment("bac1", "k", "최신 밸런스 게임은 제 채널에서 보세요!", 4);

		p.service("resume", "h", "이력서 템플릿 스튜디오", "직무별 이력서 템플릿을 골라 바로 작성해요")
			.type("COMMERCIAL").price("PAID").devices("PC").cats("PRODUCTIVITY").tags("이력서", "취업", "템플릿")
			.created(64).launches(20, 5, 60).views(130, 1, 63)
			.desc("월 구독으로 모든 템플릿을 쓸 수 있어요. 첫 일주일은 무료예요.");
		p.service("meeting", "j", "회의록 요약 노트", "회의 메모를 붙여 넣으면 할 일만 골라 정리해요")
			.type("COMMERCIAL").price("FREEMIUM").devices("PC").langs("KO", "EN").cats("PRODUCTIVITY", "UTILITY")
			.tags("회의록", "생산성").team("코지랩").created(52).launches(25, 2, 50).views(140, 1, 51).likes(4, 3, 45);
		p.service("grocery", "e", "자취생 장보기", "일주일 식단에 맞춘 장보기 목록 만들기")
			.type("TOY").cats("LIFE").tags("자취", "장보기").created(22).launches(10, 1, 20).views(70, 1, 21);
		p.service("shadow", "a", "CSS 그림자 생성기", "슬라이더로 만드는 box-shadow 코드")
			.type("TOY").devices("PC").langs("KO", "EN").cats("DEV_TOOLS", "DESIGN").tags("CSS", "프론트엔드")
			.created(68).launches(30, 5, 65).views(160, 1, 67).likes(6, 5, 60);
		p.service("regex", "f", "Regex Tester", "Test regular expressions with live highlighting")
			.type("TOY").devices("PC").langs("EN").cats("DEV_TOOLS").tags("regex", "개발도구").created(80)
			.launches(15, 10, 75).views(90, 2, 78);
		p.service("books", "g", "독서 기록장", "읽은 책과 밑줄 친 문장을 모아 두는 기록장")
			.cats("LIFE", "LEARNING").tags("독서", "기록").created(42).launches(18, 2, 40).views(100, 1, 41)
			.likes(4, 3, 38);
		p.service("rolling", "b", "롤링페이퍼", "링크 하나로 모으는 축하 메시지")
			.type("TOY").cats("ETC", "PLAY").tags("롤링페이퍼", "축하").created(18).launches(12, 1, 16)
			.views(80, 0.5, 17);
		p.service("timetable", "h", "대학 시간표 짜기", "강의를 끌어다 놓으면 겹치는 시간을 알려 줘요")
			.devices("PC").cats("UTILITY", "LEARNING").tags("시간표", "대학생").created(85).launches(20, 30, 80)
			.views(110, 5, 84);
		p.service("fonts", "j", "폰트 미리보기", "내 문장으로 무료 한글 폰트를 비교해요")
			.devices("PC").cats("DESIGN", "UTILITY").tags("폰트", "디자인").created(16).launches(10, 0.5, 15)
			.views(70, 0.2, 15);
		p.service("tarot", "k", "타로 한 장", "오늘의 운세를 카드 한 장으로")
			.type("TOY").devices("MOBILE").cats("PLAY", "ETC").tags("타로", "운세").created(12).launches(14, 0.5, 11)
			.views(90, 0.2, 11);
		p.service("chords", "f", "기타 코드 사전", "코드 이름을 누르면 운지법을 보여 줘요")
			.cats("ETC", "LEARNING").tags("기타", "음악").created(95).launches(10, 40, 90).views(60, 10, 90);
		p.service("subway", "k", "지하철 막차 알리미", "지금 출발하면 막차를 탈 수 있는지 알려 줘요")
			.devices("MOBILE").cats("UTILITY", "LIFE").tags("지하철", "막차").created(57)
			.stopped("운행 시간표 데이터를 갱신하고 있어요.").launches(25, 20, 55).views(130, 1, 56);
		p.service("pronounce", "g", "Speak Check", "Record your English and compare it with native audio")
			.langs("EN").cats("LEARNING").tags("영어", "발음").created(37).launches(12, 2, 35).views(80, 1, 36);
		p.service("colorpick", "f", "사진 색감 추출기", "사진의 분위기 색을 코드로 뽑아 줘요")
			.cats("DESIGN").tags("색상", "사진").created(9).launches(8, 0.5, 8).views(50, 0.2, 8);

		// R12·T4: 본계정이 남긴 리뷰에 제작자 답글
		Svc quiz = p.service("quiz", "g", "한국사 퀴즈", "하루 10문제로 끝내는 한국사 복습")
			.cats("LEARNING", "PLAY").tags("한국사", "퀴즈", "시험").icon("icon-quiz").thumb("square-quiz")
			.previews("quiz-1").allow(false, true, true).created(30)
			.likes(11, 1, 28).saves(2, 3, 20).launches(45, 1, 28).views(300, 0.2, 29);
		quiz.review("qz1", ME, "UP", "시대별 정답률을 보여 줘서 약한 부분을 바로 알 수 있어요.", 8)
			.reply("g", "도움이 됐다니 기뻐요! 근현대사 문제도 곧 추가할게요.", 1.6);
		quiz.review("qz2", "c", "UP", "출퇴근길에 풀기 딱 좋아요.", 12);
		quiz.comment("qzc1", "r12", "문제 틀리면 바보 인증이네요.", 3);
		quiz.comment("qzc2", "l", "조선 후기 문제가 어려워요.", 5).anonymous();
	}

	// ---------------------------------------------------------------- 안내용 [시연] 서비스 (G)

	private static void guideServices(DemoPlan p) {
		// P1~P8: 리뷰·댓글 설정 8조합
		Svc p1 = guide(p, "demo-p1", "h", "[시연] 리뷰·댓글 실명만", "비회원 리뷰 X · 익명 리뷰 X · 익명 댓글 X", false, false, false);
		p1.review("p1r", "c", "UP", "[시연] 회원 실명 리뷰예요. 이 서비스는 익명·비회원 작성을 허용하지 않아요.", 5);
		p1.comment("p1c", "l", "[시연] 회원 실명 댓글이에요. 익명 체크박스가 보이지 않아요.", 4);

		Svc p2 = guide(p, "demo-p2", "b", "[시연] 비회원 리뷰 허용", "비회원 리뷰 O · 익명 리뷰 X · 익명 댓글 X", true, false, false);
		p2.review("p2r", "guest", "NONE", "[시연] 비회원 리뷰예요. 로그아웃하면 리뷰 작성 폼이 보여요.", 5).guestIp("203.0.113.51");
		p2.comment("p2c", "n", "[시연] 댓글은 회원만 쓸 수 있어요.", 4);

		Svc p3 = guide(p, "demo-p3", "e", "[시연] 익명 리뷰 허용", "비회원 리뷰 X · 익명 리뷰 O · 익명 댓글 X", false, true, false);
		p3.review("p3r", "l", "UP", "[시연] 회원이 익명으로 남긴 리뷰예요. 작성자가 '익명'으로 보여요.", 5).anonymous();

		Svc p4 = guide(p, "demo-p4", "g", "[시연] 익명 댓글 허용", "비회원 리뷰 X · 익명 리뷰 X · 익명 댓글 O", false, false, true);
		p4.comment("p4c", "c", "[시연] 회원이 익명으로 남긴 댓글이에요.", 4).anonymous()
			.with("p4cr", "g", "[시연] 제작자 답글에는 제작자 표시가 붙어요.", 3.5);

		Svc p5 = guide(p, "demo-p5", "j", "[시연] 비회원·익명 리뷰 허용", "비회원 리뷰 O · 익명 리뷰 O · 익명 댓글 X", true, true, false);
		p5.review("p5r1", "guest", "NONE", "[시연] 비회원 리뷰예요.", 5).guestIp("198.51.100.23");
		p5.review("p5r2", "n", "UP", "[시연] 회원 익명 리뷰예요.", 4).anonymous();

		Svc p6 = guide(p, "demo-p6", "k", "[시연] 비회원 리뷰·익명 댓글", "비회원 리뷰 O · 익명 리뷰 X · 익명 댓글 O", true, false, true);
		p6.review("p6r", "guest", "NONE", "[시연] 비회원 리뷰예요.", 5).guestIp("203.0.113.77");
		p6.comment("p6c", "l", "[시연] 회원 익명 댓글이에요.", 4).anonymous();

		Svc p7 = guide(p, "demo-p7", "f", "[시연] 익명 리뷰·익명 댓글", "비회원 리뷰 X · 익명 리뷰 O · 익명 댓글 O", false, true, true);
		p7.review("p7r", "c", "DOWN", "[시연] 회원 익명 리뷰(비추천)예요.", 5).anonymous();
		p7.comment("p7c", "n", "[시연] 회원 익명 댓글이에요.", 4).anonymous();

		Svc p8 = guide(p, "demo-p8", "a", "[시연] 비회원·익명 모두 허용", "비회원 리뷰 O · 익명 리뷰 O · 익명 댓글 O", true, true, true);
		p8.review("p8r1", "guest", "NONE", "[시연] 비회원 리뷰예요.", 5).guestIp("198.51.100.61");
		p8.review("p8r2", "l", "UP", "[시연] 회원 익명 리뷰예요.", 4.5).anonymous();
		p8.review("p8r3", "c", "UP", "[시연] 회원 실명 리뷰예요.", 4);
		p8.comment("p8c1", "n", "[시연] 회원 익명 댓글이에요.", 3.5).anonymous();
		p8.comment("p8c2", "b", "[시연] 회원 실명 댓글이에요.", 3);

		// I4·I6·I7·I8: 미리보기 이미지 표시
		guide(p, "demo-previews8", "f", "[시연] 미리보기 8장", "미리보기 이미지를 최대 8장까지 넣은 사례", false, false, false)
			.icon("icon-pixel").thumb("pixel-4")
			.previews("pixel-1", "pixel-2", "pixel-3", "pixel-4", "pixel-5", "pixel-6", "pixel-7", "pixel-8");
		guide(p, "demo-wide-contain", "e", "[시연] 가로 틀에 세로 이미지", "16:9 틀 + 맞춤(여백) 표시, 세로 원본", false, false, false)
			.previews("recipe-2", "plant-1").contain();
		guide(p, "demo-tall-cover", "k", "[시연] 세로 화면 미리보기", "9:16 틀 + 채우기 표시, 세로 원본", false, false, false)
			.devices("MOBILE").previews("plant-1", "plant-2", "study-1").portrait();
		guide(p, "demo-tall-contain", "h", "[시연] 세로 틀에 가로 이미지", "9:16 틀 + 맞춤(여백) 표시, 가로 원본", false, false, false)
			.previews("budget-1", "walk-2").portrait().contain();

		// R4: 평가 20개 이상 등급 5종
		grade(p, "demo-grade-vpos", "a", "[시연] 등급 매우 긍정적", 22, 2);
		grade(p, "demo-grade-mpos", "b", "[시연] 등급 대체로 긍정적", 15, 5);
		grade(p, "demo-grade-mixed", "e", "[시연] 등급 복합적", 11, 10);
		grade(p, "demo-grade-mneg", "g", "[시연] 등급 대체로 부정적", 6, 14);
		grade(p, "demo-grade-vneg", "h", "[시연] 등급 매우 부정적", 2, 20);

		// R8·C6·C7·C10: 탈퇴 회원 글, 삭제된 댓글 자리, 비공개 닉네임
		Svc gone = guide(p, "demo-withdrawn", "h", "[시연] 탈퇴 회원 리뷰·댓글", "탈퇴 회원 글은 '떠난 나그네'로 보여요", false, false, false);
		gone.review("gr1", "w", "UP", "[시연] 탈퇴 전에 남긴 리뷰예요. 작성자가 '떠난 나그네'로 보여요.", 20)
			.reply("h", "[시연] 탈퇴 회원 리뷰에 단 제작자 답글이에요.", 19).up("c");
		gone.review("gr2", "c", "UP", "[시연] 일반 회원 리뷰예요.", 10);
		gone.comment("gc1", "w", "[시연] 탈퇴 회원이 남긴 댓글이에요.", 18)
			.with("gc1r", "c", "[시연] 탈퇴 회원 댓글에 단 답글이에요.", 17);
		gone.comment("gc2", "c", "[시연] 탈퇴 회원이 이 댓글에 답글을 달았어요.", 16)
			.with("gc2r", "w", "[시연] 탈퇴 회원의 답글이에요.", 15);
		gone.comment("gc3", "l", "[시연] (삭제된 댓글)", 14).deleted()
			.with("gc3r1", "n", "[시연] 원래 댓글은 지워졌지만 답글이 있어서 자리가 남아요.", 13)
			.with("gc3r2", "c", "[시연] 그래서 '삭제된 댓글입니다.'로 보여요.", 12);
		gone.comment("gc4", "ph", "[시연] 프로필이 비공개 처리된 회원의 댓글이에요. 닉네임이 가려져요.", 9);

		// V5·V8·O3·A4·R1
		guide(p, "demo-stopped", "g", "[시연] 운영 중지 서비스", "운영 중지 배지와 평가 제한을 확인하는 사례", false, false, false)
			.stopped("시연용으로 운영 중지 상태를 보여 주는 서비스예요.");
		guide(p, "demo-saved-hidden", "k", "[시연] 저장 후 비공개된 서비스", "저장한 뒤 운영자가 비공개한 사례(마이페이지 저장 탭)", false, false, false)
			.mine(false, true).reacted(4);
		guide(p, "demo-report3", "b", "[시연] 신고 3건 누적 서비스", "한 번 더 신고하면 4건이 되어 자동으로 임시 비공개돼요", false, false, false);
		guide(p, "demo-newest", "k", "[시연] 가장 최근 등록 서비스", "최신순 목록 맨 위에 보이는 서비스", false, false, false)
			.created(0.02);
		guide(p, "demo-empty", "f", "[시연] 리뷰·댓글 없음", "리뷰·댓글이 없을 때의 빈 화면", false, false, false);
	}

	private static Svc guide(DemoPlan p, String key, String owner, String name, String tagline, boolean guest,
			boolean anonReview, boolean anonComment) {
		return p.service(key, owner, name, tagline).type("TOY").cats("ETC").tags("시연").allow(guest, anonReview, anonComment)
			.created(40 + p.services.size() * 0.3)
			.desc("발표 시연을 위해 만든 안내용 서비스예요. 이용하기 주소는 예시 페이지로 연결돼요.")
			.launches(3, 1, 5).views(20, 0.5, 5);
	}

	private static void grade(DemoPlan p, String key, String owner, String name, int up, int down) {
		guide(p, key, owner, name, "추천 %d · 비추천 %d (평가 %d개)".formatted(up, down, up + down), false, false, false)
			.ratings(up, down, 31, 39);
	}

	// ---------------------------------------------------------------- 신고·운영 조치·제재 (O)

	private static void moderation(DemoPlan p) {
		// O1·O3: 처리 대기
		p.moderate(Kind.PENDING, Target.service("demo-report3"), 2)
			.report("r05", "UNREACHABLE", null).report("r06", "FALSE_INFORMATION", null)
			.report("r07", "OTHER", "시연용 신고예요. 한 번 더 신고하면 자동으로 임시 비공개돼요.");
		p.moderate(Kind.PENDING, Target.review("bu2"), 1.5)
			.report("c", "SPAM_ADVERTISING", null).report("l", "SPAM_ADVERTISING", "다른 앱 홍보 글이에요.");
		p.moderate(Kind.PENDING, Target.reply("wo1"), 1).report("r20", "OTHER", "답글 내용이 질문과 상관없어 보여요.");
		p.moderate(Kind.PENDING, Target.comment("bac1"), 0.8).report("c", "SPAM_ADVERTISING", null);
		p.moderate(Kind.PENDING, Target.profile("sx"), 0.6)
			.report("l", "SPAM_IMPERSONATION", null).report("n", "SPAM_IMPERSONATION", "쇼핑몰 홍보 계정 같아요.");

		// O4: 신고 누적 자동 임시 비공개(처리 대기)
		p.moderate(Kind.AUTO_HIDE, Target.service("focus"), 2.2)
			.report("r01", "UNREACHABLE", null).report("r02", "UNREACHABLE", null)
			.report("r03", "FALSE_INFORMATION", null).report("r04", "OTHER", "타이머가 시작되지 않아요.");
		p.moderate(Kind.AUTO_HIDE, Target.review("pi2"), 4)
			.report("c", "SPAM_ADVERTISING", null).report("l", "SPAM_ADVERTISING", null)
			.report("n", "ABUSE", null).report("r08", "SPAM_ADVERTISING", null);
		p.moderate(Kind.AUTO_HIDE, Target.comment("qzc1"), 2.5)
			.report("c", "ABUSE", null).report("l", "ABUSE", null).report("n", "ABUSE", null)
			.report("r09", "ABUSE", "다른 회원을 놀리는 표현이에요.");
		p.moderate(Kind.AUTO_HIDE, Target.profile("pt"), 3)
			.report("r10", "INAPPROPRIATE_EXPRESSION", null).report("r11", "INAPPROPRIATE_EXPRESSION", null)
			.report("r12", "SPAM_IMPERSONATION", null).report("r13", "OTHER", "시연용 신고예요.");

		// O5·O6: 처리 완료
		p.moderate(Kind.HIDE, Target.service("lunch"), 8)
			.report("r14", "FALSE_INFORMATION", null).report("r15", "FALSE_INFORMATION", "소개와 실제 기능이 달라요.")
			.handled("adm2", "서비스 소개와 실제 기능이 달라 비공개 처리했어요.", 6);
		p.moderate(Kind.HIDE, Target.service("demo-saved-hidden"), 5)
			.report("r16", "OTHER", "시연용 신고예요.").report("r17", "INAPPROPRIATE_CONTENT", null)
			.handled("adm2", "시연용 비공개 처리 사례예요.", 3);
		p.moderate(Kind.HIDE, Target.reply("re4"), 7).report("r21", "OTHER", "시연용 신고예요.")
			.handled(ME, "시연용으로 제작자 답글을 비공개 처리했어요.", 6.5);
		p.moderate(Kind.HIDE, Target.profile("ph"), 12)
			.report("r18", "INAPPROPRIATE_EXPRESSION", null).report("r19", "INAPPROPRIATE_EXPRESSION", null)
			.handled(ME, "부적절한 닉네임이라 프로필을 비공개 처리했어요.", 11);
		p.moderate(Kind.DELETE, Target.comment("jcdel"), 2.8)
			.report("w", "SPAM_ADVERTISING", null).report("r22", "SPAM_ADVERTISING", null)
			.handled("adm2", "다른 사이트로 유도하는 홍보 댓글이라 삭제했어요.", 2.6);
		p.moderate(Kind.DISMISS, Target.comment("tyc1"), 8.5).report("r23", "ABUSE", null)
			.handled(ME, "가벼운 농담으로 보여 기각했어요.", 8);
		p.moderate(Kind.RESTORE, Target.service("diary"), 18)
			.report("r20", "INAPPROPRIATE_CONTENT", null).report("r21", "INAPPROPRIATE_CONTENT", null)
			.report("r22", "OTHER", "시연용 신고예요.").report("r23", "OTHER", "시연용 신고예요.")
			.handled("adm2", "확인 결과 문제가 없어 복구했어요.", 17);
		p.moderate(Kind.RESTORE, Target.comment("hc3"), 10)
			.report("r05", "SPAM_ADVERTISING", null).report("r06", "SPAM_ADVERTISING", null)
			.report("r07", "SPAM_ADVERTISING", null).report("r24", "OTHER", "시연용 신고예요.")
			.handled("adm2", "제작자의 업데이트 안내라 복구했어요.", 9.5);

		// O8: 회원 제재
		p.sanction("sw", "WARNING", "adm2", "리뷰에 다른 사이트 홍보 문구를 반복해서 남겼어요.", 10);
		p.sanction("sr", "WARNING", "adm2", "같은 서비스를 여러 번 등록했어요.", 12);
		p.sanction("sr", "REGISTRATION_RESTRICTED", ME, "경고 후에도 같은 서비스를 반복 등록했어요.", 7);
		p.sanction("ss", "SUSPENDED", "adm2", "다른 회원에게 반복해서 욕설을 남겼어요.", 4);
	}

	// ---------------------------------------------------------------- 회고·초안 (M)

	private static void reflections(DemoPlan p) {
		p.reflections.add(new DemoPlan.Reflection("habit", "1.0 출시 회고", """
				## 잘한 점
				- 체크 화면을 **한 번의 탭**으로 줄였다.
				- 첫 주에 피드백을 받아 바로 고쳤다.

				## 아쉬운 점
				- 알림 시간을 고정으로 둔 것

				## 다음에 할 일
				1. 알림 시간 설정
				2. 다크 모드
				""", 68));
		p.reflections.add(new DemoPlan.Reflection("habit", "친구 랭킹 업데이트 회고", """
				친구 랭킹을 넣은 뒤 재방문이 늘었다.

				> 경쟁보다 **응원**하는 분위기를 만들고 싶다.

				- [x] 랭킹 화면
				- [ ] 응원 버튼
				""", 38));
		p.reflections.add(new DemoPlan.Reflection("memo", "단축키 회고", "단축키를 넣고 나서 *입력 속도*에 대한 칭찬이 많았다.", 9));
		p.reflections.add(new DemoPlan.Reflection("#옛날 가계부", "첫 프로젝트 회고",
				"지금은 내린 첫 서비스. 서비스는 지웠지만 회고는 남겨 둔다.", 150));
		p.draft = new DemoPlan.Draft("""
				{"name":"반려견 산책 메이트","tagline":"동네 반려견 친구와 산책 약속 잡기",
				 "url":"https://example.com/webter-demo/dog-walk","cats":["life"],"type":"side","devices":["mobile"],
				 "price":"free","owner":"solo","team":"","desc":"## 소개\\n작성 중인 초안이에요.","tags":["반려견","산책"],
				 "github":"","langs":["ko"],"iconImg":null,"thumbImg":null,"pv":[],"pvRatio":"land","pvFit":"cover",
				 "allowGuest":false,"allowAnon":true,"allowAnonComment":false,"tagInput":"","scrollY":0}
				""", 2);
	}
}

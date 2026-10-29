/* 정책 수치 · 표현 설정. 상수화는 정책 확정을 뜻하지 않는다(출처·구분은 주석 참조). */

export const POLICY = {
  trendingDays: 3, // 정책서 5.5 트렌딩 최근 3일 — 확정
  popularPeriods: ["w", "m", "all"] as const,
  popularDefault: "m" as "w" | "m" | "all", // 주간/월간/전체, 기본 월간
  aiLimitGuest: 3, // 정책서 5.4 — 제안값
  aiLimitMember: 20, // 정책서 5.4 — 제안값
  reportThreshold: 3, // 정책서 8 자동 임시 비공개 — 제안값
  dailyRegisterLimit: 3, // 정책서 4.7 — 제안값
  maxCategories: 3, // 정책서 4.8 — 제안값
  maxTags: 5, // 정책서 4.1 — 확정
  maxPreviewImages: 8, // 정책서 4.4 — 확정
  imageMaxMB: 5, // 정책서 4.4 — 확정
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  iconMinPx: 512, // 정책서 4.4 권장 — 확정(권장)
  reviewMinForGrade: 5, // 정책서 6.3 — 확정
  gradeBigN: 20, // 정책서 6.3 20개 기준 — 제안값
  scoreWeights: { click: 1, like: 3, save: 5 }, // 정책서 5.5 — 가중치 제안값
  osWeights: { like: 3, save: 5 }, // 정책서 4.10 — 제안값
  idMax: 30, // 정책서 2.1 — 확정(참고 규칙), 세부 미정
  nickMin: 2,
  nickMax: 20, // 정책서 2.1 길이 — 제안값
  replyPerReview: 1, // 정책서 6.2 — 제안값
} as const;

/* 표현 설정 — 화면 제안값(정책 아님) */
export const DISPLAY = {
  homeSections: ["trending", "popular", "latest"] as const, // 정책서 5.2 미정 → 제안 구성
  homeCount: 4,
  defaultCols: 4,
  demoToday: "2026-10-22",
  urlCheckDelay: 700, // 목업 접속 검사 지연(ms) — 결정적
  stopCanRateNew: false, // 사용 불가능 서비스의 신규 리뷰 평가: 미설정만
} as const;

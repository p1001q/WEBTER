"use client";

import { useState, type ReactNode } from "react";
import { DEV_ONLY_MARKER } from "../marker";
import type { TweakValues } from "./values";

/** 화면 바로가기: [이름, 경로, 회원 전용 여부] */
const JUMPS: [string, string, boolean?][] = [
  ["01 홈", "/"],
  ["02 트렌딩", "/trending"],
  ["03 인기", "/popular"],
  ["04 최신", "/latest"],
  ["06 검색 · 일반", "/search?q=" + encodeURIComponent("게임")],
  [
    "06 검색 · AI",
    "/search?q=" + encodeURIComponent("친구와 10분 정도 즐길 수 있는 웹게임"),
  ],
  ["07 상세", "/services/s01"],
  ["07 상세 · 댓글 탭", "/services/s01?tab=comments"],
  ["07 상세 · 운영 중지", "/services/s16"],
  ["07 상세 · 본인 서비스", "/services/s10", true],
  ["07 상세 · 없는 서비스", "/services/none"],
  ["08 로그인", "/login"],
  ["09 가입 온보딩", "/onboarding"],
  ["10 서비스 등록", "/services/new", true],
  ["10 등록 완료", "/services/s10/registered", true],
  ["11 내 서비스 관리", "/manage", true],
  ["12 수정", "/services/s10/edit", true],
  ["13 마이페이지", "/mypage", true],
  ["13 마이페이지 · 리뷰·댓글 · 댓글", "/mypage?tab=comments", true],
  ["13 알림", "/notifications", true],
  ["14 제작자 프로필", "/users/u_bori"],
  ["14 프로필 · 없는 사용자", "/users/none"],
  ["16 이용약관", "/terms"],
  ["17 개인정보", "/privacy"],
  ["오류 · 없는 주소(404)", "/no-such-page"],
  ["오류 · 화면 렌더링 실패", "/dev/crash-screen"],
  ["오류 · 앱 전체 실패 (뒤로 가기로 복귀)", "/dev/crash-app"],
];

interface Props {
  t: TweakValues;
  onChange: (patch: Partial<TweakValues>) => void;
  onJump: (path: string, memberOnly: boolean) => void;
  onReset: () => void;
}

const row = (label: string, el: ReactNode) => (
  <div role="group" aria-label={label} className="flex flex-col gap-1">
    <span className="font-semibold text-text-3">{label}</span>
    {el}
  </div>
);

/** 개발 서버 전용 데모 컨트롤. 세션·화면 폭·샘플 데이터를 바꿔 상태를 재현한다 */
export function Tweaks({ t, onChange, onJump, onReset }: Props) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        data-dev-marker={DEV_ONLY_MARKER}
        className="fixed right-4 bottom-4 z-[80] h-8 cursor-pointer rounded-pill border border-border-strong bg-card px-3 font-mono text-11 text-text-2 shadow-card hover:border-ink hover:text-ink"
        onClick={() => setOpen(true)}
      >
        Tweaks
      </button>
    );
  const seg = <K extends keyof TweakValues>(
    k: K,
    opts: [TweakValues[K], string][],
  ) => (
    <div className="flex flex-wrap gap-0.5 rounded-md bg-light p-0.5">
      {opts.map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={t[k] === v}
          className={
            "h-[26px] flex-1 cursor-pointer rounded-[6px] px-1.5 text-12 font-semibold whitespace-nowrap " +
            (t[k] === v
              ? "bg-card text-ink shadow-[0_1px_2px_rgb(0_0_0/0.1)]"
              : "text-text-3")
          }
          onClick={() => onChange({ [k]: v } as Partial<TweakValues>)}
        >
          {l}
        </button>
      ))}
    </div>
  );
  return (
    <div
      role="dialog"
      aria-label="Tweaks"
      data-dev-marker={DEV_ONLY_MARKER}
      className="fixed right-4 bottom-4 z-[2147483000] flex max-h-[calc(100vh-32px)] w-[300px] flex-col gap-2.5 overflow-y-auto rounded-lg border border-border bg-card px-3.5 pt-3 pb-3.5 text-12 shadow-pop"
    >
      <div className="flex items-baseline gap-2">
        <b className="text-13">Tweaks</b>
        <span className="text-11 text-muted">
          데모 컨트롤 · 기능 범위와 무관
        </span>
        <button
          type="button"
          aria-label="닫기"
          className="ml-auto cursor-pointer text-13 text-muted"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      {row(
        "화면 바로가기",
        <select
          aria-label="화면 바로가기"
          className="h-ctl-sm rounded-md border border-border bg-card px-2 text-12"
          value=""
          onChange={(e) => {
            const j = JUMPS[Number(e.target.value)];
            if (j) onJump(j[1], !!j[2]);
          }}
        >
          <option value="">화면 선택…</option>
          {JUMPS.map(([l], i) => (
            <option key={l} value={i}>
              {l}
            </option>
          ))}
        </select>,
      )}
      {row(
        "세션",
        seg("session", [
          ["guest", "비회원"],
          ["member", "회원"],
          ["signup", "신규 가입"],
        ]),
      )}
      {row(
        "미리보기",
        seg("viewport", [
          ["desktop", "데스크톱"],
          ["mobile", "모바일 390"],
        ]),
      )}
      {row(
        "카드 열 수",
        seg("cols", [
          [3, "3열"],
          [4, "4열"],
        ]),
      )}
      {row(
        "내 서비스 샘플",
        seg("sample", [
          ["default", "기본 4개"],
          ["none", "없음"],
          ["stopped", "전부 운영 중지"],
        ]),
      )}
      {row(
        "오류 상황",
        seg("fault", [
          ["none", "없음"],
          ["server", "서버 오류"],
          ["network", "연결 끊김"],
          ["session", "로그인 만료"],
          ["slow", "느린 응답"],
        ]),
      )}
      {row(
        "데이터 상태",
        seg("data", [
          ["default", "기본"],
          ["quiet", "리뷰·댓글 없음"],
          ["empty", "서비스 없음"],
        ]),
      )}
      {row(
        "이미지",
        seg("images", [
          ["ok", "정상"],
          ["broken", "깨짐"],
        ]),
      )}
      <button
        type="button"
        className="h-ctl-sm cursor-pointer rounded-md border border-border bg-card text-12 font-semibold"
        onClick={onReset}
      >
        데모 초기화
      </button>
    </div>
  );
}

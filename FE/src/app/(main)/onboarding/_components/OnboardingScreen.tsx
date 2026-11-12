"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  checkUsername,
  fetchCurrentPolicies,
  fetchSession,
} from "@/api/auth/authApi";
import { realAuth } from "@/api/auth/config";
import type { CategoryId, PolicyVersion } from "@/api/types";
import { CategoryGlyph } from "@/components/service/CategoryGlyph";
import { Button } from "@/components/ui/Button";
import {
  checkClass,
  counterClass,
  demoButtonClass,
  fieldClass,
  inputClass,
  labelClass,
  requiredMarkClass,
} from "@/components/ui/field";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { RouteLink } from "@/components/ui/RouteLink";
import { CATEGORIES } from "@/domain/options";
import { POLICY } from "@/domain/policy";
import {
  handleCheck,
  msgState,
  NICK_RULE_HINT,
  nickCheck,
  nickWeight,
  type FieldState,
} from "@/domain/validation";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { AuthCard, authSubClass } from "../../_components/AuthCard";

/** 가입 요청에 모두 실려야 하는 필수 약관(없으면 서버가 가입을 거절한다) */
const REQUIRED_POLICY_TYPES = ["TERMS", "PRIVACY", "AGE_CONFIRMATION"];

const linkClass =
  "text-[12.5px] font-bold text-navy underline underline-offset-[3px]";

/** 온보딩 3단계: 약관 동의, 아이디·닉네임, 관심 카테고리. 단계는 `step` 쿼리로 시작한다 */
export function OnboardingScreen({
  back,
  step: stepParam,
}: {
  back?: string;
  step: number;
}) {
  const wt = useWt();
  const P = useId();
  const [step, setStep] = useState(stepParam);
  const [agree, setAgree] = useState({
    terms: false,
    privacy: false,
    age: false,
  });
  const [handle, setHandle] = useState("");
  const [nick, setNick] = useState("");
  const [cats, setCats] = useState<CategoryId[]>([]);
  /** 서버가 이미 사용 중이라고 알려 준 아이디(실제 로그인에서만 쓴다) */
  const [taken, setTaken] = useState<string[]>([]);
  /** 가입 요청에 실을, 화면을 연 시점의 약관 버전(실제 로그인에서만 쓴다) */
  const [policies, setPolicies] = useState<PolicyVersion[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [policyLoading, setPolicyLoading] = useState(realAuth);
  const [policyError, setPolicyError] = useState("");
  const [policyNotice, setPolicyNotice] = useState("");
  const policyRun = useRef(0);
  const policiesReady =
    !realAuth ||
    (policies !== null &&
      REQUIRED_POLICY_TYPES.every((type) =>
        policies.some((p) => p.documentType === type),
      ));
  const refreshPolicies = useCallback(async () => {
    const run = ++policyRun.current;
    setPolicies(null);
    setPolicyLoading(true);
    setPolicyError("");
    try {
      const current = await fetchCurrentPolicies();
      if (run === policyRun.current) setPolicies(current);
    } catch {
      if (run === policyRun.current)
        setPolicyError("약관을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (run === policyRun.current) setPolicyLoading(false);
    }
  }, []);
  const all = agree.terms && agree.privacy && agree.age;
  const hc = handleCheck(handle, [...wt.takenHandles, ...taken]);
  // 서버가 사용 중이라고 했던 아이디도 바꿀 때마다 다시 확인한다(그 사이 풀렸을 수 있다)
  const staleTaken = hc.state === "taken" && taken.includes(handle);
  const nc = nickCheck(nick);
  const canNext2 = hc.state === "ok" && nc.state === "ok";

  // 실제 로그인: 구글 인증을 마친 가입 대기 상태로만 온보딩을 진행할 수 있다
  const { go } = wt;
  useEffect(() => {
    if (!realAuth) return;
    let live = true;
    const cancelPolicyLoad = () => {
      policyRun.current++;
    };
    (async () => {
      try {
        const s = await fetchSession();
        if (!live) return;
        if (s.status === "ANONYMOUS") go("login", { back }, { replace: true });
        else if (s.status === "MEMBER") go("home", {}, { replace: true });
        else await refreshPolicies();
      } catch {
        if (live) {
          setPolicyLoading(false);
          setPolicyError("가입 상태를 확인하지 못했어요. 새로고침해 주세요.");
        }
      }
    })();
    return () => {
      live = false;
      cancelPolicyLoad();
    };
  }, [go, back, refreshPolicies]);

  // 아이디 중복은 입력이 멈춘 뒤 서버에 물어본다
  useEffect(() => {
    if (!realAuth || (hc.state !== "ok" && !staleTaken)) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsername(handle);
        if (!live) return;
        setTaken((t) =>
          available
            ? t.filter((x) => x !== handle)
            : t.includes(handle)
              ? t
              : [...t, handle],
        );
      } catch {
        // 확인하지 못해도 제출할 때 서버가 다시 검사한다
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [handle, hc.state, staleTaken]);

  // ?step= 으로 앞 단계를 건너뛰고 들어와도, 가입 전에 빠진 단계로 되돌린다
  const finish = async (skip: boolean) => {
    if (submittingRef.current) return;
    if (!all || !policiesReady) return setStep(1);
    if (!canNext2) return setStep(2);
    // 렌더링 전 연속 클릭과 아이디 확인 중의 클릭도 한 번의 제출로 묶는다.
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (realAuth && !(await checkUsername(handle).catch(() => true))) {
        setTaken((t) => [...t, handle]);
        return setStep(2);
      }
      const result = await wt.signup(
        {
          handle,
          nick,
          interests: skip ? [] : cats,
          consents: policies ?? undefined,
        },
        back,
      );
      if (result === "policyChanged") {
        setAgree({ terms: false, privacy: false, age: false });
        setPolicyNotice(
          "약관이 변경됐어요. 최신 약관을 확인하고 다시 동의해 주세요.",
        );
        setStep(1);
        await refreshPolicies();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const tog = (c: CategoryId) =>
    setCats(
      cats.includes(c)
        ? cats.filter((x) => x !== c)
        : cats.length >= POLICY.maxCategories
          ? cats
          : [...cats, c],
    );
  const agreeRows = [
    ["terms", "이용약관 동의", "terms"],
    ["privacy", "개인정보 수집·이용 동의", "privacy"],
    ["age", "만 14세 이상입니다", null],
  ] as const;
  const inputState = (s: FieldState) =>
    msgState(s) === "err" ? "border-wine!" : s === "ok" ? "border-navy!" : "";
  return (
    <AuthCard wide data-component="onboarding" data-step={step}>
      <div className="mb-6 flex gap-2">
        <span className="sr-only">3단계 중 {step}단계</span>
        {["약관 동의", "아이디·닉네임", "관심 카테고리"].map((l, i) => (
          <div
            key={l}
            className={cx(
              "flex flex-1 flex-col gap-1.5 text-12 font-semibold",
              step === i + 1 ? "text-ink" : "text-muted",
            )}
          >
            <i
              className={cx(
                "block h-[3px] rounded-[2px]",
                step >= i + 1 ? "bg-navy" : "bg-border",
              )}
            />
            {i + 1}. {l}
          </div>
        ))}
      </div>
      {step === 1 && (
        <>
          <h1 style={{ marginTop: 0 }}>약관에 동의해 주세요</h1>
          <p className={authSubClass}>
            웹터를 이용하려면 아래 항목에 모두 동의해야 해요.
          </p>
          {policyNotice && (
            <FieldMessage state="idle">{policyNotice}</FieldMessage>
          )}
          {policyLoading && (
            <FieldMessage state="wait">약관을 불러오고 있어요.</FieldMessage>
          )}
          {policyError && (
            <>
              <FieldMessage state="err">{policyError}</FieldMessage>
              <Button variant="ghost" onClick={() => void refreshPolicies()}>
                약관 다시 불러오기
              </Button>
            </>
          )}
          <label
            className={cx(
              checkClass,
              "rounded-md border border-border px-4 py-3.5 font-bold",
            )}
          >
            <input
              type="checkbox"
              disabled={!policiesReady || policyLoading}
              checked={all}
              onChange={(e) =>
                setAgree({
                  terms: e.target.checked,
                  privacy: e.target.checked,
                  age: e.target.checked,
                })
              }
            />
            전체 동의
          </label>
          <div className="flex flex-col gap-3 px-4 py-2">
            {agreeRows.map(([k, l, doc]) => (
              <div key={k} className="flex items-center gap-2">
                <label className={cx(checkClass, "flex-1 justify-between")}>
                  <input
                    type="checkbox"
                    disabled={!policiesReady || policyLoading}
                    checked={agree[k]}
                    onChange={(e) =>
                      setAgree({ ...agree, [k]: e.target.checked })
                    }
                  />
                  <span>
                    <span className={requiredMarkClass}>[필수]</span> {l}
                  </span>
                </label>
                {doc && (
                  <RouteLink
                    to={doc}
                    className={linkClass}
                    aria-label={`${l} 보기`}
                  >
                    보기
                    {policies?.find(
                      (p) =>
                        p.documentType ===
                        (doc === "terms" ? "TERMS" : "PRIVACY"),
                    )?.version && (
                      <span className="ml-1 font-mono text-11">
                        {
                          policies.find(
                            (p) =>
                              p.documentType ===
                              (doc === "terms" ? "TERMS" : "PRIVACY"),
                          )?.version
                        }
                      </span>
                    )}
                  </RouteLink>
                )}
              </div>
            ))}
          </div>
          {!all && (
            <FieldMessage state="idle">
              필수 항목{" "}
              {
                (["terms", "privacy", "age"] as const).filter((k) => !agree[k])
                  .length
              }
              개에 아직 동의하지 않았어요.
            </FieldMessage>
          )}
          <Button
            size="lg"
            block
            disabled={!all || !policiesReady || policyLoading}
            onClick={() => setStep(2)}
          >
            다음
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <h1 style={{ marginTop: 0 }}>아이디와 닉네임을 정해 주세요</h1>
          <p className={authSubClass}>
            아이디는 프로필 주소에 쓰이고, 닉네임은 화면에 표시돼요. 둘 다
            나중에 바꿀 수 있어요.
          </p>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor={P + "onb-id"}>
              아이디 <span className={requiredMarkClass}>*</span>
              <span className={counterClass}>
                {handle.length}/{POLICY.idMax}
              </span>
            </label>
            <input
              id={P + "onb-id"}
              className={cx(inputClass, "font-mono", inputState(hc.state))}
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="예: dawn.code"
              autoComplete="off"
              data-validate={hc.state}
            />
            <FieldMessage state={msgState(hc.state)}>
              {hc.msg || "영문 소문자·숫자·마침표·밑줄, 공백 없이 30자까지"}
            </FieldMessage>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor={P + "onb-nick"}>
              닉네임 <span className={requiredMarkClass}>*</span>
              <span className={counterClass}>
                {nickWeight(nick)}/{POLICY.nickMaxWeight}
              </span>
            </label>
            <input
              id={P + "onb-nick"}
              className={cx(inputClass, inputState(nc.state))}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="예: 새벽코딩"
              data-validate={nc.state}
            />
            <FieldMessage state={msgState(nc.state)}>
              {nc.msg || `${NICK_RULE_HINT} 다른 사람과 같아도 괜찮아요.`}
            </FieldMessage>
          </div>
          {!realAuth && (
            <div className="flex flex-wrap items-center gap-1.5 text-12 text-muted">
              샘플:{" "}
              <button
                type="button"
                className={demoButtonClass}
                onClick={() => setHandle("bori_tea")}
              >
                사용 중
              </button>
              <button
                type="button"
                className={demoButtonClass}
                onClick={() => setHandle("dawn code!")}
              >
                형식 오류
              </button>
              <button
                type="button"
                className={demoButtonClass}
                onClick={() => {
                  setHandle("new.maker");
                  setNick("새내기");
                }}
              >
                사용 가능
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!canNext2}
              onClick={() => setStep(3)}
            >
              다음
            </Button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <h1 style={{ marginTop: 0 }}>관심 있는 용도를 골라 주세요</h1>
          <p className={authSubClass}>
            최대 {POLICY.maxCategories}개까지 고를 수 있어요. 홈에서 해당 용도의
            트렌딩·인기를 먼저 보여 드려요.
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cx(
                  "inline-flex h-[38px] items-center gap-1.5 rounded-md border px-3.5 text-14 font-semibold",
                  cats.includes(c.id)
                    ? "border-navy bg-navy-50 text-navy"
                    : "border-border bg-card",
                )}
                aria-pressed={cats.includes(c.id)}
                disabled={
                  submitting ||
                  (!cats.includes(c.id) && cats.length >= POLICY.maxCategories)
                }
                onClick={() => tog(c.id)}
              >
                <CategoryGlyph cat={c.id} size={16} />
                {c.label}
              </button>
            ))}
          </div>
          <FieldMessage state="idle">
            {cats.length}/{POLICY.maxCategories}개 선택 · 마이페이지에서 언제든
            바꿀 수 있어요.
          </FieldMessage>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="lg"
              disabled={submitting}
              onClick={() => setStep(2)}
            >
              이전
            </Button>
            <Button
              variant="ghost"
              size="lg"
              disabled={submitting}
              onClick={() => void finish(true)}
            >
              건너뛰기
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={submitting}
              onClick={() => void finish(false)}
            >
              {submitting ? "가입 중…" : "시작하기"}
            </Button>
          </div>
        </>
      )}
    </AuthCard>
  );
}

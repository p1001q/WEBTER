"use client";

import { useId, useState } from "react";
import type { CategoryId } from "@/api/types";
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
  nickCheck,
  type FieldState,
} from "@/domain/validation";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { AuthCard, authSubClass } from "../../_components/AuthCard";

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
  const all = agree.terms && agree.privacy && agree.age;
  const hc = handleCheck(handle, wt.takenHandles);
  const nc = nickCheck(nick);
  const canNext2 = hc.state === "ok" && nc.state === "ok";
  // ?step= 으로 앞 단계를 건너뛰고 들어와도, 가입 전에 빠진 단계로 되돌린다
  const finish = (skip: boolean) => {
    if (!all) return setStep(1);
    if (!canNext2) return setStep(2);
    wt.signup({ handle, nick, interests: skip ? [] : cats }, back);
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
          <label
            className={cx(
              checkClass,
              "rounded-md border border-border px-4 py-3.5 font-bold",
            )}
          >
            <input
              type="checkbox"
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
          <Button size="lg" block disabled={!all} onClick={() => setStep(2)}>
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
                {nick.length}/{POLICY.nickMax}
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
              {nc.msg ||
                `${POLICY.nickMin}~${POLICY.nickMax}자, 다른 사람과 같아도 괜찮아요`}
            </FieldMessage>
          </div>
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
                  !cats.includes(c.id) && cats.length >= POLICY.maxCategories
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
            <Button variant="ghost" size="lg" onClick={() => setStep(2)}>
              이전
            </Button>
            <Button variant="ghost" size="lg" onClick={() => finish(true)}>
              건너뛰기
            </Button>
            <Button size="lg" className="flex-1" onClick={() => finish(false)}>
              시작하기
            </Button>
          </div>
        </>
      )}
    </AuthCard>
  );
}

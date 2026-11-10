"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { failureText, toApiError } from "@/api/errors";
import type { Price, ProjectType, Service, ServiceInput } from "@/api/types";
import { Footer } from "@/components/layout/Footer";
import { isMaker } from "@/domain/maker";
import { Restricted } from "@/components/layout/Restricted";
import { Button } from "@/components/ui/Button";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { Switch } from "@/components/ui/Switch";
import { Tag } from "@/components/ui/Tag";
import { boxClass } from "@/components/ui/box";
import {
  checkClass,
  counterClass,
  demoButtonClass,
  fieldClass,
  helpClass,
  inputClass,
  labelClass,
  optionalClass,
  requiredMarkClass,
  textareaClass,
} from "@/components/ui/field";
import { CATEGORIES, OPT, TYPE_SHORT } from "@/domain/options";
import { DISPLAY, POLICY } from "@/domain/policy";
import { githubCheck, urlFormat } from "@/domain/validation";
import { cx } from "@/lib/cx";
import { scrollFieldIntoFocus } from "@/lib/focusScroll";
import { useWt } from "@/providers/context";
import { ListHead } from "../../_components/ListHead";
import {
  formClass,
  formLayoutClass,
  optionButtonClass,
  optionRowClass,
  sectionClass,
  sectionTitleClass,
  submitBarClass,
  twoColumnClass,
} from "../../_components/formStyles";
import { FormAside } from "./FormAside";
import { ImageFields } from "./ImageFields";
import {
  BLANK_PREVIEW,
  EMPTY_FORM,
  URL_MSG,
  URL_SAMPLES,
  fromService,
  type ArrayKey,
  type FormState,
  type UrlSt,
  type UrlStateName,
} from "./serviceFormState";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const monoInput = "font-mono text-14!";

/** 서비스 등록(`new`)·수정(`edit`)이 같이 쓰는 폼 */
export function ServiceForm({
  mode,
  id,
}: {
  mode: "new" | "edit";
  id?: string;
}) {
  const wt = useWt();
  const P = useId();
  const editing = mode === "edit";
  const src = editing ? wt.svc(id) : undefined;
  const [f, setF] = useState<FormState>(() =>
    src ? fromService(src) : { ...EMPTY_FORM },
  );
  const [urlSt, setUrlSt] = useState<UrlSt>(() =>
    editing
      ? {
          state: "ok",
          msg: "등록된 주소예요. 주소를 바꾸면 다시 검사해야 해요.",
        }
      : { state: "idle" },
  );
  const [tagIn, setTagIn] = useState("");
  const [touched, setTouched] = useState(false);
  /** 진행 중인 접속 검사 번호. 주소를 고치거나 화면을 떠나면 올려서 이전 결과를 버린다 */
  const checkRun = useRef(0);
  /** 등록·수정 요청을 보냈는지. 화면이 넘어가기 전에 버튼을 또 눌러도 한 번만 보낸다 */
  const submitting = useRef(false);
  const [sending, setSending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(
    () => () => {
      checkRun.current = -1;
    },
    [],
  );
  if (editing && !src) return <Restricted title="서비스를 찾을 수 없어요" />;
  if (editing && src && !isMaker(src, wt.me?.id))
    return (
      <Restricted
        title="수정 권한이 없어요"
        desc="본인이 등록한 서비스만 수정할 수 있어요."
      />
    );
  const limitHit = !editing && wt.todayCount >= POLICY.dailyRegisterLimit;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const tog = (k: ArrayKey, v: string, max?: number) =>
    setF((x) => {
      const cur = x[k] as string[];
      const next = cur.includes(v)
        ? cur.filter((y) => y !== v)
        : max && cur.length >= max
          ? cur
          : [...cur, v];
      return { ...x, [k]: next };
    });
  const onUrl = (v: string) => {
    set("url", v);
    checkRun.current++;
    const fm = urlFormat(v);
    setUrlSt(fm.state === "format" ? fm : { state: "idle" });
  };
  const runCheck = async () => {
    const fm = urlFormat(f.url);
    if (fm.state !== "pass") {
      setUrlSt(
        fm.state === "idle"
          ? { state: "format", msg: "서비스 주소를 입력해 주세요." }
          : fm,
      );
      return;
    }
    setUrlSt({ state: "checking" });
    const run = ++checkRun.current;
    let r: UrlSt;
    try {
      [r] = await Promise.all([
        wt.checkServiceUrl(f.url, src?.id),
        delay(DISPLAY.urlCheckDelay),
      ]);
    } catch (e) {
      // 주소 자체가 아니라 확인 요청이 실패한 것이라 접속 불가와 구분해서 다시 검사하게 한다
      r = {
        state: "error",
        msg: failureText("주소를 확인하지", toApiError(e)),
      };
    }
    if (checkRun.current === run) setUrlSt(r);
  };
  const ghErr = githubCheck(f.github);
  const required: [string, boolean][] = [
    ["서비스 이름", !!f.name.trim()],
    ["한 줄 소개", !!f.tagline.trim()],
    ["서비스 주소 접속 확인", urlSt.state === "ok"],
    ["서비스 용도", f.cats.length > 0],
    ["프로젝트 유형", !!f.type],
    ["기기 지원", f.devices.length > 0],
    ["가격", !!f.price],
    [
      "등록 주체",
      f.owner === "solo" || (f.owner === "team" && !!f.team.trim()),
    ],
    ["등록 확인 동의", f.agree],
  ];
  const done = required.filter((r) => r[1]).length;
  const canSubmit = done === required.length && !ghErr && !limitHit;
  const addTag = () => {
    const t = tagIn.trim().replace(/^#/, "");
    if (!t || f.tags.includes(t) || f.tags.length >= POLICY.maxTags) {
      setTagIn("");
      return;
    }
    set("tags", [...f.tags, t]);
    setTagIn("");
  };
  const submit = async () => {
    setTouched(true);
    if (!canSubmit || submitting.current) return;
    const data: ServiceInput = {
      name: f.name.trim(),
      tagline: f.tagline.trim(),
      url: f.url.trim(),
      cats: f.cats,
      type: f.type as ProjectType,
      devices: f.devices,
      price: f.price as Price,
      team: f.owner === "team" ? f.team.trim() : null,
      desc: f.desc.trim(),
      tags: f.tags,
      github: f.github.trim() || null,
      langs: f.langs.length ? f.langs : ["ko"],
      iconImg: f.iconImg,
      thumbImg: f.thumbImg,
      hasIcon: !!f.iconImg,
      hasThumb: !!f.thumbImg,
      previews: f.pv.length
        ? { ratio: f.pvRatio, fit: f.pvFit, count: f.pv.length, imgs: f.pv }
        : null,
      allowGuest: f.allowGuest,
      allowAnon: f.allowAnon,
      allowAnonComment: f.allowAnonComment,
    };
    submitting.current = true;
    setSaveFailed(false);
    setSending(true);
    if (src) {
      const keep = {
        hasIcon: f.iconImg ? true : src.iconImg ? false : src.hasIcon,
        hasThumb: f.thumbImg ? true : src.thumbImg ? false : src.hasThumb,
        previews: f.pv.length
          ? data.previews
          : src.previews && !src.previews.imgs
            ? { ...src.previews, ratio: f.pvRatio, fit: f.pvFit }
            : null,
      };
      if (await wt.updateService(src.id, { ...data, ...keep })) {
        wt.toast("수정 내용을 저장했어요.");
        wt.go("detail", { id: src.id });
        return;
      }
    } else {
      const s = await wt.createService(data);
      if (s) {
        wt.go("registered", { id: s.id });
        return;
      }
    }
    // 실패하면 입력한 내용은 그대로 두고 다시 누를 수 있게 한다
    submitting.current = false;
    setSending(false);
    setSaveFailed(true);
  };
  const base = src ?? BLANK_PREVIEW;
  const preview: Service = {
    ...base,
    id: "preview",
    name: f.name || "서비스 이름",
    tagline: f.tagline || "한 줄 소개가 여기에 표시돼요",
    cats: f.cats.length ? f.cats : ["etc"],
    thumbImg: f.thumbImg,
    hasThumb: !!f.thumbImg || (src ? !src.thumbImg && src.hasThumb : false),
    rv: { up: 0, down: 0, none: 0 },
    sc: [0, 0, 0],
  };
  const urlState: UrlStateName = urlSt.state === "pass" ? "idle" : urlSt.state;
  const urlMsgState = (
    {
      idle: "idle",
      checking: "wait",
      ok: "ok",
      unreachable: "err",
      format: "err",
      dup: "err",
      error: "err",
      pass: "idle",
    } as const
  )[urlState];
  const showErr = (cond: boolean) => touched && cond;
  const errBorder = (cond: boolean) => (showErr(cond) ? "border-wine!" : "");
  const radio = <T extends string>(
    labelId: string,
    value: T | "",
    options: [T, string][],
    onPick: (v: T) => void,
    render: (v: T, l: string) => ReactNode = (_, l) => l,
  ) => (
    <div className={optionRowClass} role="radiogroup" aria-labelledby={labelId}>
      {options.map(([v, l]) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === v}
          key={v}
          className={optionButtonClass(value === v)}
          onClick={() => onPick(v)}
        >
          {render(v, l)}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <div className="page-wrap">
        <ListHead
          flush
          title={editing ? "서비스 수정" : "서비스 등록"}
          desc={
            editing
              ? "수정한 내용은 저장하면 바로 반영돼요."
              : "배포되어 지금 바로 이용할 수 있는 웹 서비스만 등록할 수 있어요."
          }
        />
        {limitHit && (
          <div className="mt-5" data-component="daily-limit">
            <Note tone="wine">
              <Icon name="alert" size={16} />
              오늘은 서비스를 {POLICY.dailyRegisterLimit}개까지 등록할 수
              있어요. 이미 {wt.todayCount}개를 등록해서 내일 다시 등록할 수
              있어요.
            </Note>
          </div>
        )}
        <div className={formLayoutClass}>
          <div
            className={formClass}
            onFocus={(e) => scrollFieldIntoFocus(e.target)}
            onClick={(e) => scrollFieldIntoFocus(e.target)}
          >
            <section className={sectionClass} aria-labelledby={P + "fs-basic"}>
              <h2 className={sectionTitleClass} id={P + "fs-basic"}>
                기본 정보 <small>필수</small>
              </h2>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor={P + "f-name"}>
                  서비스 이름 <span className={requiredMarkClass}>*</span>
                  <span className={counterClass}>{f.name.length}/40</span>
                </label>
                <input
                  id={P + "f-name"}
                  className={cx(inputClass, errBorder(!f.name.trim()))}
                  maxLength={40}
                  value={f.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="예: 둘이서 한 판"
                />
                {showErr(!f.name.trim()) && (
                  <FieldMessage state="err">
                    서비스 이름을 입력해 주세요.
                  </FieldMessage>
                )}
              </div>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor={P + "f-tl"}>
                  한 줄 소개 <span className={requiredMarkClass}>*</span>
                  <span className={counterClass}>{f.tagline.length}/60</span>
                </label>
                <input
                  id={P + "f-tl"}
                  className={cx(inputClass, errBorder(!f.tagline.trim()))}
                  maxLength={60}
                  value={f.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="카드와 검색 결과에 보이는 소개예요"
                />
                {showErr(!f.tagline.trim()) && (
                  <FieldMessage state="err">
                    한 줄 소개를 입력해 주세요.
                  </FieldMessage>
                )}
              </div>
              <div
                className={fieldClass}
                data-component="url-field"
                data-url-state={urlState}
              >
                <label className={labelClass} htmlFor={P + "f-url"}>
                  서비스 주소 <span className={requiredMarkClass}>*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id={P + "f-url"}
                    className={cx(
                      inputClass,
                      monoInput,
                      urlMsgState === "err"
                        ? "border-wine!"
                        : urlState === "ok"
                          ? "border-navy!"
                          : "",
                    )}
                    value={f.url}
                    onChange={(e) => onUrl(e.target.value)}
                    placeholder="https://"
                    inputMode="url"
                    aria-describedby={P + "f-url-msg"}
                  />
                  <Button
                    variant="ghost"
                    className="h-ctl-input! rounded-md!"
                    disabled={urlState === "checking" || urlState === "ok"}
                    onClick={runCheck}
                  >
                    {urlState === "checking"
                      ? "검사 중"
                      : urlState === "ok"
                        ? "확인됨"
                        : urlState === "error"
                          ? "다시 검사"
                          : "접속 검사"}
                  </Button>
                </div>
                <div id={P + "f-url-msg"}>
                  <FieldMessage state={urlMsgState}>
                    {urlSt.msg || URL_MSG[urlState]}
                  </FieldMessage>
                </div>
                <div
                  className="flex flex-wrap items-center gap-1.5 text-12 text-muted"
                  aria-label="데모 샘플 주소"
                >
                  데모 샘플:
                  {URL_SAMPLES.map(([l, v]) => (
                    <button
                      key={l}
                      type="button"
                      className={demoButtonClass}
                      onClick={() => onUrl(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className={fieldClass}>
                <span className={labelClass} id={P + "f-cats"}>
                  서비스 용도 <span className={requiredMarkClass}>*</span>
                  <span className={optionalClass}>
                    최대 {POLICY.maxCategories}개 · 처음 고른 용도가 대표 용도
                  </span>
                  <span className={counterClass}>
                    {f.cats.length}/{POLICY.maxCategories}
                  </span>
                </span>
                <div
                  className={optionRowClass}
                  role="group"
                  aria-labelledby={P + "f-cats"}
                >
                  {CATEGORIES.map((c) => {
                    const i = f.cats.indexOf(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={optionButtonClass(i >= 0)}
                        aria-pressed={i >= 0}
                        disabled={
                          i < 0 && f.cats.length >= POLICY.maxCategories
                        }
                        onClick={() => tog("cats", c.id, POLICY.maxCategories)}
                      >
                        {c.label}
                        {i === 0 && (
                          <span className="rounded-[3px] bg-navy px-1 font-mono text-[10px] text-white">
                            대표
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {showErr(!f.cats.length) && (
                  <FieldMessage state="err">
                    서비스 용도를 하나 이상 골라 주세요.
                  </FieldMessage>
                )}
              </div>
              <div className={twoColumnClass}>
                <div className={fieldClass}>
                  <span className={labelClass} id={P + "f-type"}>
                    프로젝트 유형 <span className={requiredMarkClass}>*</span>
                  </span>
                  {radio(
                    P + "f-type",
                    f.type,
                    OPT.type,
                    (v) => set("type", v),
                    (v) => TYPE_SHORT[v],
                  )}
                </div>
                <div className={fieldClass}>
                  <span className={labelClass} id={P + "f-price"}>
                    가격 <span className={requiredMarkClass}>*</span>
                  </span>
                  {radio(P + "f-price", f.price, OPT.price, (v) =>
                    set("price", v),
                  )}
                </div>
              </div>
              <div className={twoColumnClass}>
                <div className={fieldClass}>
                  <span className={labelClass}>
                    기기 지원 <span className={requiredMarkClass}>*</span>
                    <span className={optionalClass}>복수 선택</span>
                  </span>
                  <div className={optionRowClass}>
                    {OPT.devices.map(([v, l]) => (
                      <button
                        type="button"
                        aria-pressed={f.devices.includes(v)}
                        key={v}
                        className={optionButtonClass(f.devices.includes(v))}
                        onClick={() => tog("devices", v)}
                      >
                        <Icon
                          name={v === "pc" ? "desktop" : "phone"}
                          size={15}
                        />
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={fieldClass}>
                  <span className={labelClass} id={P + "f-owner"}>
                    등록 주체 <span className={requiredMarkClass}>*</span>
                  </span>
                  {radio(P + "f-owner", f.owner, OPT.owner, (v) =>
                    set("owner", v),
                  )}
                </div>
              </div>
              {f.owner === "team" && (
                <div className={fieldClass} data-component="team-name">
                  <label className={labelClass} htmlFor={P + "f-team"}>
                    팀명 <span className={requiredMarkClass}>*</span>
                    <span className={counterClass}>{f.team.length}/30</span>
                  </label>
                  <input
                    id={P + "f-team"}
                    className={cx(inputClass, errBorder(!f.team.trim()))}
                    maxLength={30}
                    value={f.team}
                    onChange={(e) => set("team", e.target.value)}
                    placeholder="예: 얼렁뚱땅"
                  />
                  <p className={helpClass}>
                    팀원(공동 작업자) 계정 추가는 확장 기능이에요. 지금은 팀명만
                    표시돼요.
                  </p>
                </div>
              )}
            </section>

            <section className={sectionClass} aria-labelledby={P + "fs-more"}>
              <h2 className={sectionTitleClass} id={P + "fs-more"}>
                추가 정보 <small>선택</small>
              </h2>
              <div className={fieldClass}>
                <label className={labelClass} htmlFor={P + "f-desc"}>
                  상세 설명
                  <span className={counterClass}>{f.desc.length}/2000</span>
                </label>
                <textarea
                  id={P + "f-desc"}
                  className={textareaClass}
                  maxLength={2000}
                  value={f.desc}
                  onChange={(e) => set("desc", e.target.value)}
                  placeholder="어떤 서비스인지, 어떻게 쓰는지 알려 주세요."
                />
              </div>
              <ImageFields f={f} setF={setF} />
              <div className={fieldClass}>
                <label className={labelClass} htmlFor={P + "f-tag"}>
                  태그
                  <span className={optionalClass}>
                    최대 {POLICY.maxTags}개 · Enter로 추가
                  </span>
                  <span className={counterClass}>
                    {f.tags.length}/{POLICY.maxTags}
                  </span>
                </label>
                <div className="flex min-h-ctl-input flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 focus-within:border-navy focus-within:shadow-[0_0_0_3px_var(--color-focus)]">
                  {f.tags.map((t) => (
                    <Tag
                      key={t}
                      removeLabel={`${t} 태그 삭제`}
                      onRemove={() =>
                        set(
                          "tags",
                          f.tags.filter((x) => x !== t),
                        )
                      }
                    >
                      #{t}
                    </Tag>
                  ))}
                  {f.tags.length < POLICY.maxTags && (
                    <input
                      id={P + "f-tag"}
                      className="h-[30px] min-w-[120px] flex-1 border-0 bg-transparent text-14 outline-0"
                      value={tagIn}
                      onChange={(e) => setTagIn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={addTag}
                      placeholder="예: 2인용"
                    />
                  )}
                </div>
              </div>
              <div className={twoColumnClass}>
                <div className={fieldClass}>
                  <label className={labelClass} htmlFor={P + "f-gh"}>
                    GitHub 링크
                    <span className={optionalClass}>소스를 공개한 경우</span>
                  </label>
                  <input
                    id={P + "f-gh"}
                    className={cx(
                      inputClass,
                      monoInput,
                      ghErr ? "border-wine!" : "",
                    )}
                    value={f.github}
                    onChange={(e) => set("github", e.target.value)}
                    placeholder="https://github.com/아이디/저장소"
                  />
                  {ghErr ? (
                    <FieldMessage state="err">{ghErr}</FieldMessage>
                  ) : (
                    <p className={helpClass}>
                      상세 페이지에 작은 코드 아이콘(&lt;/&gt;)으로만 연결돼요.
                    </p>
                  )}
                </div>
                <div className={fieldClass}>
                  <span className={labelClass}>
                    지원 언어
                    <span className={optionalClass}>
                      복수 선택 · 기본 한국어
                    </span>
                  </span>
                  <div className={optionRowClass}>
                    {OPT.langs.map(([v, l]) => (
                      <button
                        type="button"
                        aria-pressed={f.langs.includes(v)}
                        key={v}
                        className={optionButtonClass(f.langs.includes(v))}
                        onClick={() => tog("langs", v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="grid grid-cols-2 items-start gap-10 @max-[860px]/app:grid-cols-1">
                <div
                  className="flex flex-col gap-[22px]"
                  role="group"
                  aria-labelledby={P + "fs-cm"}
                  data-component="comment-settings"
                >
                  <h2 className={sectionTitleClass} id={P + "fs-cm"}>
                    댓글 설정
                  </h2>
                  <Switch
                    on={f.allowAnonComment}
                    onChange={(v) => set("allowAnonComment", v)}
                    label="회원 익명 댓글 허용"
                    desc="회원이 댓글마다 익명으로 남길지 고를 수 있어요."
                  />
                  {f.allowAnonComment && (
                    <Note tone="butter">
                      <Icon name="alert" size={16} />
                      익명 댓글을 허용하면 스팸, 비방, 욕설이 달릴 수 있어요.
                      문제가 되는 댓글은 신고할 수 있어요.
                    </Note>
                  )}
                </div>
                <div
                  className="flex flex-col gap-[22px]"
                  role="group"
                  aria-labelledby={P + "fs-rv"}
                  data-component="review-settings"
                >
                  <h2 className={sectionTitleClass} id={P + "fs-rv"}>
                    리뷰 설정
                  </h2>
                  <Switch
                    on={f.allowAnon}
                    onChange={(v) => set("allowAnon", v)}
                    label="회원 익명 리뷰 허용"
                    desc="회원이 리뷰마다 익명으로 남길지 고를 수 있어요."
                  />
                  <Switch
                    on={f.allowGuest}
                    onChange={(v) => set("allowGuest", v)}
                    label="비회원 리뷰 허용"
                    desc="로그인하지 않은 사람도 평가 없이(미설정) 리뷰를 남길 수 있어요."
                  />
                  {(f.allowGuest || f.allowAnon) && (
                    <Note tone="butter">
                      <Icon name="alert" size={16} />
                      익명·비회원 리뷰를 허용하면 스팸, 비방, 욕설이 달릴 수
                      있어요. 문제가 되는 리뷰는 신고할 수 있어요.
                    </Note>
                  )}
                </div>
              </div>
            </section>

            <label
              className={cx(
                checkClass,
                boxClass,
                "px-[18px] py-4",
                showErr(!f.agree) && "border-wine!",
              )}
            >
              <input
                type="checkbox"
                checked={f.agree}
                onChange={(e) => set("agree", e.target.checked)}
              />
              <span>
                <span className={requiredMarkClass}>[필수]</span> 직접
                만들었거나 등록 권한이 있는 서비스이며, 허위 정보·권리 침해·악성
                코드·무단 개인정보가 있으면 비공개·삭제될 수 있음에 동의합니다
              </span>
            </label>
            <div className={submitBarClass}>
              {saveFailed && (
                <FieldMessage state="err">
                  {editing ? "수정" : "등록"}하지 못했어요. 입력한 내용은 그대로
                  남아 있어요. 잠시 뒤에 다시 시도해 주세요.
                </FieldMessage>
              )}
              {touched && !canSubmit && (
                <FieldMessage state="err">
                  {limitHit
                    ? "오늘 등록 가능 개수를 모두 사용했어요."
                    : done === required.length
                      ? "GitHub 주소를 확인해 주세요."
                      : `필수 항목 ${required.length - done}개를 확인해 주세요.`}
                </FieldMessage>
              )}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => (editing ? wt.go("manage") : wt.back())}
              >
                취소
              </Button>
              <Button
                size="lg"
                aria-disabled={!canSubmit || sending}
                onClick={submit}
              >
                {sending
                  ? editing
                    ? "저장 중…"
                    : "등록 중…"
                  : editing
                    ? "수정 완료"
                    : "등록하기"}
              </Button>
            </div>
          </div>
          <FormAside preview={preview} required={required} />
        </div>
      </div>
      <Footer />
    </>
  );
}

"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { normalizeLink, PROFILE_LINK_MAX } from "@/domain/profileLinks";
import { realAuth } from "@/api/auth/config";
import type { CategoryId, LinkKind } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClass } from "@/components/ui/Button";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { boxClass } from "@/components/ui/box";
import {
  counterClass,
  fieldClass,
  helpClass,
  inputClass,
  labelClass,
  optionalClass,
  selectClass,
} from "@/components/ui/field";
import { CATEGORIES, LINK_LABEL } from "@/domain/options";
import { DISPLAY, POLICY } from "@/domain/policy";
import {
  IMAGE_UNREADABLE,
  handleCheck,
  handleChangeStatus,
  imageError,
  imgSize,
  linkCheck,
  msgState,
  nickCheck,
  nickWeight,
  readAsURL,
} from "@/domain/validation";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import {
  formClass,
  optionButtonClass,
  optionRowClass,
  sectionClass,
  sectionTitleClass,
  settingsLayoutClass,
  submitBarClass,
  twoColumnClass,
} from "../../_components/formStyles";

/** 계정 설정: 프로필·관심 카테고리 수정, 로그인 계정, 탈퇴 */
export function SettingsPanel() {
  const wt = useWt();
  const P = useId();
  const me = wt.me!;
  const [nick, setNick] = useState(me.nick);
  const [handle, setHandle] = useState(me.handle);
  const [bio, setBio] = useState(me.bio || "");
  const [links, setLinks] = useState<[LinkKind, string][]>(
    me.links.map((l) => [...l]),
  );
  const [cats, setCats] = useState<CategoryId[]>(me.interests || []);
  const [avatarDraft, setAvatarDraft] = useState<string | null>();
  const avatar =
    avatarDraft === undefined ? (me.avatarImg ?? null) : avatarDraft;
  const avatarChanged = avatar !== (me.avatarImg ?? null);
  const [avErr, setAvErr] = useState("");
  const [readingAvatar, setReadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 사진 읽기 순번. 새로 고르거나 되돌리면 올려서 늦게 끝난 이전 읽기를 버린다 */
  const avatarRun = useRef(0);
  const hc = handleCheck(handle, wt.takenHandles, me.handle, {
    required: true,
  });
  const nc = nickCheck(nick, { required: true });
  const hs = handleChangeStatus(me.handleChanges, DISPLAY.demoToday);
  // 아이디 변경 횟수 제한은 서버 규칙이 정해지기 전이라 실제 로그인에서는 걸지 않는다
  const handleLocked = !realAuth && hs.left === 0;
  const dirty =
    nick !== me.nick ||
    handle !== me.handle ||
    bio !== (me.bio || "") ||
    JSON.stringify(links.filter((l) => l[1].trim())) !==
      JSON.stringify(me.links) ||
    JSON.stringify(cats) !== JSON.stringify(me.interests || []) ||
    avatarChanged;
  const linkErrs = links.map(([k, u]) => linkCheck(k, u));
  // 서버는 같은 종류의 링크를 하나만 저장한다
  const dupKind =
    realAuth &&
    new Set(links.filter((l) => l[1].trim()).map((l) => l[0])).size <
      links.filter((l) => l[1].trim()).length;
  const ok =
    hc.state === "ok" &&
    nc.state === "ok" &&
    linkErrs.every((e) => !e) &&
    !dupKind;
  const pickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const run = ++avatarRun.current;
    const err = imageError(f);
    if (err) {
      setAvErr(err);
      setReadingAvatar(false);
      return;
    }
    setAvErr("");
    setReadingAvatar(true);
    const url = await readAsURL(f);
    const readable = url && (await imgSize(url))[0] > 0;
    if (avatarRun.current !== run) return;
    setReadingAvatar(false);
    if (readable) setAvatarDraft(url);
    else setAvErr(IMAGE_UNREADABLE);
  };
  const tog = (c: CategoryId) =>
    setCats(
      cats.includes(c)
        ? cats.filter((x) => x !== c)
        : cats.length >= POLICY.maxCategories
          ? cats
          : [...cats, c],
    );
  const reset = () => {
    setNick(me.nick);
    setHandle(me.handle);
    setBio(me.bio || "");
    setLinks(me.links.map((l) => [...l]));
    setCats(me.interests || []);
    setAvatarDraft(undefined);
    setAvErr("");
    setReadingAvatar(false);
    avatarRun.current++;
  };
  const save = async () => {
    setSaving(true);
    const sent = links
      .filter((l) => l[1].trim())
      .map(([k, u]): [LinkKind, string] => [
        k,
        realAuth ? normalizeLink(u) : u,
      ]);
    const saved = await wt.updateMe({
      nick,
      handle,
      bio,
      links: sent,
      interests: cats,
      ...(avatarChanged && { avatarImg: avatar }),
    });
    if (saved) setAvatarDraft(undefined);
    // 서버가 정리한 주소로 입력칸을 맞춰 저장 직후 "변경 사항 있음"이 남지 않게 한다
    if (saved && realAuth) {
      // 저장을 기다리는 동안 새로 편집한 값은 덮어쓰지 않는다.
      setLinks((current) =>
        JSON.stringify(current) === JSON.stringify(links)
          ? saved.links.map((l) => [...l])
          : current,
      );
    }
    setSaving(false);
  };
  const errBorder = (s: Parameters<typeof msgState>[0]) =>
    msgState(s) === "err" ? "border-wine!" : "";
  return (
    <div className={settingsLayoutClass} data-component="settings">
      <div className={formClass}>
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>프로필</h2>
          <div className="flex items-center gap-4">
            <Avatar user={{ ...me, avatarImg: avatar }} size={72} />
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <label
                  className={cx(
                    buttonClass({ variant: "ghost", size: "sm" }),
                    saving ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  )}
                >
                  사진 변경
                  <input
                    type="file"
                    accept={POLICY.imageTypes.join(",")}
                    className="sr-only"
                    disabled={saving}
                    onChange={pickAvatar}
                  />
                </label>
                {avatar && (
                  <Button
                    variant="text"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      avatarRun.current++;
                      setAvatarDraft(null);
                      setReadingAvatar(false);
                      setAvErr("");
                    }}
                  >
                    기본 사진으로
                  </Button>
                )}
              </div>
              {avErr ? (
                <FieldMessage state="err">{avErr}</FieldMessage>
              ) : (
                <span className={helpClass}>
                  JPG·PNG·WebP, {POLICY.imageMaxMB}MB 이하
                </span>
              )}
            </div>
          </div>
          <div className={twoColumnClass}>
            <div className={fieldClass}>
              <label className={labelClass} htmlFor={P + "set-nick"}>
                닉네임
                <span className={counterClass}>
                  {nickWeight(nick)}/{POLICY.nickMaxWeight}
                </span>
              </label>
              <input
                id={P + "set-nick"}
                className={cx(inputClass, errBorder(nc.state))}
                value={nick}
                onChange={(e) => setNick(e.target.value)}
              />
              {nc.state !== "ok" && (
                <FieldMessage state={msgState(nc.state)}>{nc.msg}</FieldMessage>
              )}
            </div>
            <div className={fieldClass}>
              <label className={labelClass} htmlFor={P + "set-id"}>
                아이디
                <span className={counterClass}>
                  {handle.length}/{POLICY.idMax}
                </span>
              </label>
              <input
                id={P + "set-id"}
                className={cx(inputClass, "font-mono", errBorder(hc.state))}
                value={handle}
                disabled={handleLocked}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
              />
              <FieldMessage state={msgState(hc.state)}>
                {handle === me.handle
                  ? "현재 아이디예요. 바꿔도 내 서비스·리뷰 연결은 유지돼요."
                  : hc.msg}
              </FieldMessage>
              {!realAuth && (
                <span className={helpClass}>
                  {handleLocked
                    ? `아이디는 ${POLICY.handleChangeDays}일 안에 ${POLICY.handleChangeMax}번까지 바꿀 수 있어요. ${hs.waitDays}일 뒤에 다시 바꿀 수 있어요.`
                    : `아이디는 ${POLICY.handleChangeDays}일 안에 ${POLICY.handleChangeMax}번까지 바꿀 수 있어요. (남은 횟수 ${hs.left}번)`}
                </span>
              )}
            </div>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor={P + "set-bio"}>
              한 줄 소개 <span className={optionalClass}>선택</span>
              <span className={counterClass}>{bio.length}/80</span>
            </label>
            <input
              id={P + "set-bio"}
              className={inputClass}
              maxLength={80}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className={fieldClass}>
            <span className={labelClass}>
              외부 링크 <span className={optionalClass}>선택</span>
            </span>
            {links.map(([k, url], i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div
                  role="group"
                  aria-label={`외부 링크 ${i + 1}`}
                  className="grid grid-cols-[140px_1fr_auto] gap-2"
                >
                  <select
                    className={selectClass}
                    aria-label="링크 종류"
                    value={k}
                    onChange={(e) =>
                      setLinks(
                        links.map((l, j) =>
                          j === i ? [e.target.value as LinkKind, l[1]] : l,
                        ),
                      )
                    }
                  >
                    {Object.entries(LINK_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input
                    className={cx(inputClass, linkErrs[i] && "border-wine!")}
                    aria-label="링크 주소"
                    maxLength={PROFILE_LINK_MAX}
                    aria-invalid={!!linkErrs[i]}
                    value={url}
                    onChange={(e) =>
                      setLinks(
                        links.map((l, j) =>
                          j === i ? [l[0], e.target.value] : l,
                        ),
                      )
                    }
                  />
                  <IconButton
                    aria-label="링크 삭제"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  >
                    <Icon name="close" size={16} />
                  </IconButton>
                </div>
                {linkErrs[i] && (
                  <FieldMessage state="err">{linkErrs[i]}</FieldMessage>
                )}
              </div>
            ))}
            {dupKind && (
              <FieldMessage state="err">
                같은 종류의 링크는 하나만 저장할 수 있어요.
              </FieldMessage>
            )}
            {links.length < 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setLinks([...links, ["blog", ""]])}
              >
                <Icon name="plus" size={14} />
                링크 추가
              </Button>
            )}
          </div>
        </div>
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>
            관심 카테고리 <small>최대 {POLICY.maxCategories}개</small>
          </h2>
          <div className={optionRowClass}>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={optionButtonClass(cats.includes(c.id))}
                aria-pressed={cats.includes(c.id)}
                disabled={
                  !cats.includes(c.id) && cats.length >= POLICY.maxCategories
                }
                onClick={() => tog(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className={submitBarClass}>
          <span className={helpClass}>
            {dirty ? "저장하지 않은 변경 사항이 있어요." : "변경 사항 없음"}
          </span>
          <Button
            variant="ghost"
            disabled={saving || (!dirty && !readingAvatar)}
            onClick={reset}
          >
            되돌리기
          </Button>
          <Button
            disabled={!dirty || !ok || saving || readingAvatar}
            onClick={save}
          >
            저장
          </Button>
        </div>
      </div>
      <aside className="flex flex-col gap-3">
        <div className={`${boxClass} flex flex-col gap-2 p-5`}>
          <b>로그인 계정</b>
          <span className={helpClass}>
            {me.email ? `Google · ${me.email} (비공개)` : "Google 계정"}
          </span>
        </div>
        <div>
          <Button variant="ghost" size="sm" onClick={() => wt.logout()}>
            <Icon name="logout" size={15} />
            로그아웃
          </Button>
        </div>
        <div
          className={`${boxClass} flex flex-col gap-2.5 p-5`}
          data-component="withdraw-info"
        >
          <b>회원 탈퇴</b>
          <ul className="m-0 list-disc pl-[18px] text-13 leading-[1.8] text-text-2">
            <li>등록한 서비스는 삭제돼요.</li>
            <li>작성한 리뷰는 “탈퇴한 사용자”로 남아요.</li>
            <li>좋아요·저장 기록은 삭제돼요.</li>
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-wine!"
            onClick={() => wt.setModal({ type: "withdraw" })}
          >
            탈퇴하기
          </Button>
        </div>
      </aside>
    </div>
  );
}

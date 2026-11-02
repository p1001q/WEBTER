"use client";

import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { Icon } from "@/components/ui/Icon";
import { boxClass } from "@/components/ui/box";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  counterClass,
  helpClass,
  labelClass,
  optionalClass,
} from "@/components/ui/field";
import { ServiceThumb } from "@/components/service/ServiceThumb";
import { POLICY } from "@/domain/policy";
import { imageError, imgSize, readAsURL } from "@/domain/validation";
import { cx } from "@/lib/cx";
import { dropClass, removeImageClass } from "../../_components/formStyles";
import { BLANK_PREVIEW, type FormState } from "./serviceFormState";

const IMG_ACCEPT = "image/jpeg,image/png,image/webp";
type ImgErr = Partial<
  Record<"icon" | "thumb" | "pv" | "iconWarn", string | null>
>;

/** 아이콘·썸네일·미리보기 이미지 올리기 */
export function ImageFields({
  f,
  setF,
}: {
  f: FormState;
  setF: Dispatch<SetStateAction<FormState>>;
}) {
  const [imgErr, setImgErr] = useState<ImgErr>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const pick = async (
    kind: "icon" | "thumb" | "pv",
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    if (kind === "pv") {
      const room = POLICY.maxPreviewImages - f.pv.length;
      const errs: string[] = [];
      const ok: File[] = [];
      for (const file of files) {
        const er = imageError(file);
        if (er) errs.push(`${file.name}: ${er}`);
        else ok.push(file);
      }
      if (ok.length > room)
        errs.push(
          `미리보기는 최대 ${POLICY.maxPreviewImages}장이에요. ${ok.length - room}장은 추가하지 않았어요.`,
        );
      const urls = await Promise.all(
        ok.slice(0, Math.max(room, 0)).map(readAsURL),
      );
      setF((x) => ({ ...x, pv: [...x.pv, ...urls] }));
      setImgErr((x) => ({ ...x, pv: errs.join(" ") || null }));
      return;
    }
    const file = files[0];
    const er = imageError(file);
    if (er) {
      setImgErr((x) => ({ ...x, [kind]: er }));
      return;
    }
    const url = await readAsURL(file);
    let warn: string | null = null;
    if (kind === "icon") {
      const [w, h] = await imgSize(url);
      if (w !== h)
        warn = "정사각형 이미지가 아니라 가운데를 기준으로 잘려 보여요.";
      else if (w < POLICY.iconMinPx)
        warn = `${POLICY.iconMinPx}×${POLICY.iconMinPx} 이상을 권장해요. (현재 ${w}×${h})`;
    }
    setImgErr((x) => ({ ...x, [kind]: null, [kind + "Warn"]: warn }));
    set(kind === "icon" ? "iconImg" : "thumbImg", url);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2" data-component="image-upload">
      <span className={labelClass}>
        이미지{" "}
        <span className={optionalClass}>
          JPG·PNG·WebP, 장당 {POLICY.imageMaxMB}MB 이하 · 올리지 않으면 대표
          용도의 기본 이미지가 쓰여요
        </span>
      </span>
      <div className="grid grid-cols-[120px_1fr] gap-4 @max-[560px]/app:grid-cols-1">
        <div className="relative aspect-square">
          {f.iconImg ? (
            <>
              <div
                className="relative grid size-full shrink-0 place-items-center overflow-hidden border border-ink/6"
                style={{ borderRadius: 24 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.iconImg}
                  alt="아이콘 미리보기"
                  className="size-full object-cover"
                />
              </div>
              <button
                type="button"
                className={removeImageClass}
                aria-label="아이콘 삭제"
                onClick={() => {
                  set("iconImg", null);
                  setImgErr((x) => ({ ...x, iconWarn: null }));
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </>
          ) : (
            <label className={cx(dropClass(!!imgErr.icon), "size-full")}>
              <Icon name="upload" size={20} />
              <b className="text-13">아이콘</b>
              <span className="text-11">
                정사각형
                <br />
                {POLICY.iconMinPx}px 이상
              </span>
              <input
                type="file"
                accept={IMG_ACCEPT}
                onChange={(e) => pick("icon", e)}
              />
            </label>
          )}
        </div>
        <div className="relative aspect-[16/10]">
          {f.thumbImg ? (
            <>
              <ServiceThumb
                s={{ ...BLANK_PREVIEW, thumbImg: f.thumbImg }}
                style={{ borderRadius: 8, height: "100%" }}
              />
              <button
                type="button"
                className={removeImageClass}
                aria-label="썸네일 삭제"
                onClick={() => set("thumbImg", null)}
              >
                <Icon name="close" size={14} />
              </button>
            </>
          ) : (
            <label className={cx(dropClass(!!imgErr.thumb), "size-full")}>
              <Icon name="image" size={22} />
              <b className="text-13">썸네일</b>
              <span className="text-11">
                카드 비율(16:10)로 가운데를 기준으로 잘려요
              </span>
              <input
                type="file"
                accept={IMG_ACCEPT}
                onChange={(e) => pick("thumb", e)}
              />
            </label>
          )}
        </div>
      </div>
      {imgErr.icon && (
        <FieldMessage state="err">아이콘 — {imgErr.icon}</FieldMessage>
      )}
      {imgErr.iconWarn && (
        <FieldMessage state="idle">아이콘 — {imgErr.iconWarn}</FieldMessage>
      )}
      {imgErr.thumb && (
        <FieldMessage state="err">썸네일 — {imgErr.thumb}</FieldMessage>
      )}
      <div className={`${boxClass} flex flex-col gap-3 bg-[#fbfaf7]! p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <b className="text-14">미리보기</b>
          <span className={cx(counterClass, "ml-0!")}>
            {f.pv.length}/{POLICY.maxPreviewImages}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <SegmentedControl
              label="미리보기 비율"
              value={f.pvRatio}
              onChange={(v) => set("pvRatio", v)}
              options={[
                ["land", "가로 16:9"],
                ["port", "세로 9:16"],
              ]}
            />
            <SegmentedControl
              label="이미지 맞춤"
              value={f.pvFit}
              onChange={(v) => set("pvFit", v)}
              options={[
                ["cover", "꽉 채우기"],
                ["contain", "전체 보이기"],
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {f.pv.map((u, i) => (
            <div key={i} className={pvClass(f.pvRatio)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`미리보기 ${i + 1}`}
                className="block size-full"
                style={{ objectFit: f.pvFit === "cover" ? "cover" : "contain" }}
              />
              <button
                type="button"
                className={removeImageClass}
                aria-label={`미리보기 ${i + 1} 삭제`}
                onClick={() =>
                  set(
                    "pv",
                    f.pv.filter((_, j) => j !== i),
                  )
                }
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          {f.pv.length < POLICY.maxPreviewImages && (
            <label className={cx(dropClass(false, true), pvClass(f.pvRatio))}>
              <Icon name="plus" size={18} />
              <span className="text-11">추가</span>
              <input
                type="file"
                multiple
                accept={IMG_ACCEPT}
                onChange={(e) => pick("pv", e)}
              />
            </label>
          )}
        </div>
        {imgErr.pv ? (
          <FieldMessage state="err">{imgErr.pv}</FieldMessage>
        ) : (
          <p className={helpClass}>
            모든 미리보기는 같은 비율로 표시돼요. 꽉 채우기는 가운데를 기준으로
            자르고, 전체 보이기는 남는 곳을 여백으로 둬요. 올리지 않으면 상세의
            미리보기 영역이 생략돼요.
          </p>
        )}
      </div>
    </div>
  );
}

const pvClass = (ratio: "land" | "port") =>
  cx(
    "relative overflow-hidden rounded-md border border-border bg-light",
    ratio === "land" ? "aspect-video w-40" : "aspect-[9/16] w-[72px]",
  );

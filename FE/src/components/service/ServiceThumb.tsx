import type { CSSProperties } from "react";
import type { Service } from "@/api/types";
import { CAT } from "@/domain/options";
import { CategoryGlyph } from "./CategoryGlyph";
import styles from "./ServiceThumb.module.css";
import { ThumbArt } from "./ThumbArt";

type ThumbSource = Pick<Service, "cats" | "hasThumb" | "thumb"> & {
  thumbImg?: string | null;
};

/** 썸네일: 업로드 이미지 > 목업 스크린샷 > 카테고리 기본 이미지 */
export function ServiceThumb({
  s,
  v = 0,
  plain = false,
  style,
  className,
}: {
  s: ThumbSource;
  v?: number;
  plain?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const c = CAT[s.cats[0]] || CAT.etc;
  const root = className ? `${styles.thumb} ${className}` : styles.thumb;
  if (s.thumbImg)
    return (
      <div className={root} style={style}>
        {/* 사용자가 올린 이미지의 크기·출처를 알 수 없어 next/image 최적화를 쓰지 않는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.img} src={s.thumbImg} alt="" />
      </div>
    );
  if (!s.hasThumb)
    return (
      <div
        className={root}
        style={{ background: c.bg, ...style }}
        data-default-thumb=""
      >
        <div className={styles.fallback} style={{ color: c.fg }}>
          <CategoryGlyph cat={c.id} size={44} />
          <b>{c.label}</b>
        </div>
      </div>
    );
  return (
    <div className={root} style={{ background: s.thumb.bg, ...style }}>
      {plain ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <ThumbArt s={s} v={v} />
        </div>
      ) : (
        <div className={styles.win}>
          <div className={styles.bar}>
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className={styles.body}>
            <ThumbArt s={s} v={v} />
          </div>
        </div>
      )}
    </div>
  );
}

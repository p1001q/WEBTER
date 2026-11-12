import type { Service } from "@/api/types";
import { CAT } from "@/domain/options";
import { ImgFrame } from "@/components/ui/SafeImg";
import { CategoryGlyph } from "./CategoryGlyph";

type IconSource = Pick<Service, "cats" | "hasIcon" | "thumb" | "name"> & {
  iconImg?: string | null;
};

const box =
  "relative grid shrink-0 place-items-center overflow-hidden border border-ink/6";

/** 서비스 아이콘: 업로드 > 이름 첫 글자 아이콘 > 카테고리 기본 아이콘 */
export function ServiceIcon({
  s,
  size = 64,
}: {
  s: IconSource;
  size?: number;
}) {
  const c = CAT[s.cats[0]] || CAT.etc;
  const frame = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.24),
  };
  const defaultIcon = (
    <div
      className={box}
      style={{ ...frame, background: c.bg, color: c.fg }}
      data-default-icon=""
    >
      <CategoryGlyph cat={c.id} size={Math.round(size * 0.5)} />
    </div>
  );
  if (s.iconImg)
    return (
      <ImgFrame
        src={s.iconImg}
        frameClassName={box}
        frameStyle={frame}
        imgClassName="size-full object-cover"
        fallback={defaultIcon}
      />
    );
  if (!s.hasIcon) return defaultIcon;
  const fg = s.thumb.a === "#F2DB94" ? "#242424" : s.thumb.a;
  return (
    <div className={box} style={{ ...frame, background: s.thumb.bg }}>
      <span
        style={{
          fontSize: Math.round(size * 0.42),
          fontWeight: 800,
          color: fg,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {s.name[0]}
      </span>
    </div>
  );
}

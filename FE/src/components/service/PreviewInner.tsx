import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { ImgFrame } from "@/components/ui/SafeImg";
import { ServiceThumb } from "./ServiceThumb";

const inner = "absolute inset-0 flex items-center justify-center";

/** 세로(9:16) 미리보기용 모바일 목업 */
function PortraitShot({ s, v = 0 }: { s: Pick<Service, "thumb">; v?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: s.thumb.bg,
        display: "flex",
        flexDirection: "column",
        padding: "10% 8%",
        gap: "4%",
      }}
    >
      <div
        style={{
          height: "5%",
          width: "50%",
          background: s.thumb.a,
          borderRadius: 4,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: 8,
          padding: "8%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div
            key={i}
            style={{
              height: 8,
              width: ((w + v * 7) % 100) + "%",
              background: i === v % 5 ? s.thumb.b || "#F2DB94" : "#ECEAE4",
              borderRadius: 4,
            }}
          />
        ))}
        <div
          style={{
            marginTop: "auto",
            height: 28,
            borderRadius: 14,
            background: s.thumb.a,
          }}
        />
      </div>
    </div>
  );
}

/** 상세 미리보기·라이트박스 한 장 */
export function PreviewInner({
  s,
  i,
  fit,
}: {
  s: Service;
  i: number;
  fit?: "cover" | "contain";
}) {
  const p = s.previews!;
  const f = fit || p.fit;
  if (p.imgs && p.imgs[i])
    return (
      <ImgFrame
        src={p.imgs[i]}
        frameClassName={inner}
        imgStyle={{
          width: "100%",
          height: "100%",
          objectFit: f === "cover" ? "cover" : "contain",
        }}
        fallback={
          <div
            className={`${inner} flex-col gap-2 bg-light text-13 text-muted`}
          >
            <Icon name="image" size={28} />
            이미지를 불러오지 못했어요
          </div>
        }
      />
    );
  if (p.ratio === "port")
    return (
      <div className={inner}>
        <PortraitShot s={s} v={i} />
      </div>
    );
  return (
    <div className={inner}>
      <ServiceThumb
        s={{ ...s, hasThumb: true }}
        v={i}
        plain={f === "cover"}
        className={f === "cover" ? "absolute! inset-0 aspect-auto!" : "w-full"}
      />
    </div>
  );
}

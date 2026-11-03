"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

const darkIconButton = "bg-white/10! text-white! hover:bg-white/20!";
const OPEN_MS = 300;
const CLOSE_MS = 240;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 올린 이미지를 크게 보는 화면. 작은 상자에서 화면 가운데로 커지며 열리고,
 * 닫으면 원래 상자 자리로 돌아간다. 뒷배경은 어둡게 깔린다.
 * `getOrigin` 은 몇 번째 이미지의 원래 상자(DOM)를 돌려준다. 상자는 열려 있는 동안 숨겨 둔다.
 */
export function ImageZoom({
  srcs,
  index,
  ratio,
  fit,
  label,
  getOrigin,
  onClose,
}: {
  srcs: string[];
  index: number;
  ratio: "land" | "port";
  fit: "cover" | "contain";
  label: string;
  getOrigin: (i: number) => HTMLElement | null;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const frame = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const ctl = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const n = srcs.length;

  /** 이미지 상자가 원래 상자 자리·크기에서 시작하는 변형 */
  const fromOrigin = (o: HTMLElement) => {
    const f = frame.current!.getBoundingClientRect();
    const r = o.getBoundingClientRect();
    return `translate(${r.left - f.left}px, ${r.top - f.top}px) scale(${r.width / f.width}, ${r.height / f.height})`;
  };

  // 열 때: 원래 상자에서 가운데로 커진다
  useLayoutEffect(() => {
    const o = getOrigin(index);
    if (!o || !frame.current || reducedMotion()) return;
    // 개발 모드에서 효과가 두 번 실행돼도 이전 모션이 크기 측정에 끼지 않게 한다
    frame.current.getAnimations().forEach((a) => a.cancel());
    frame.current.animate(
      [{ transform: fromOrigin(o) }, { transform: "none" }],
      { duration: OPEN_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    const fade = [{ opacity: 0 }, { opacity: 1 }];
    back.current?.animate(fade, { duration: OPEN_MS, easing: "ease" });
    ctl.current?.animate(fade, { duration: OPEN_MS, easing: "ease" });
    // 처음 열 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 보고 있는 이미지의 원래 상자는 숨긴다(이미지가 떠오른 것처럼 보이게)
  useLayoutEffect(() => {
    const o = getOrigin(i);
    if (o) o.style.visibility = "hidden";
    return () => {
      if (o) o.style.visibility = "";
    };
  }, [i, getOrigin]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const o = getOrigin(i);
    const f = frame.current;
    if (!o || !f || reducedMotion()) {
      onClose();
      return;
    }
    // 열리는 중에 닫아도 지금 모습에서 이어서 돌아가도록, 현재 변형을 시작점으로 잡는다
    const start = getComputedStyle(f).transform;
    f.getAnimations().forEach((a) => a.cancel());
    const done = f.animate(
      [{ transform: start }, { transform: fromOrigin(o) }],
      {
        duration: CLOSE_MS,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    const fade = [{ opacity: 1 }, { opacity: 0 }];
    const opts = {
      duration: CLOSE_MS,
      easing: "ease",
      fill: "forwards",
    } as const;
    back.current?.animate(fade, opts);
    ctl.current?.animate(fade, opts);
    done.finished.then(onClose, onClose);
  };

  const step = (d: number) => {
    if (!closing.current && n > 1) setI((x) => (x + d + n) % n);
  };
  const keys = useRef({ close, step });
  useEffect(() => {
    keys.current = { close, step };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.close();
      if (e.key === "ArrowRight") keys.current.step(1);
      if (e.key === "ArrowLeft") keys.current.step(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const size =
    ratio === "land"
      ? {
          width: "min(92vw, calc((100dvh - 180px) * 16 / 9))",
          aspectRatio: "16 / 9",
        }
      : {
          height: "min(calc(100dvh - 180px), calc(92vw * 16 / 9))",
          aspectRatio: "9 / 16",
        };

  return createPortal(
    <div
      className="fixed inset-0 z-[65]"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={back}
        className="absolute inset-0 bg-[rgb(20_20_20/0.78)] backdrop-blur-[3px]"
        onClick={close}
      />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          ref={frame}
          className="pointer-events-auto relative overflow-hidden rounded-md bg-light shadow-pop"
          style={{ ...size, transformOrigin: "0 0" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={i}
            src={srcs[i]}
            alt={`미리보기 ${i + 1}`}
            className="block size-full animate-fade"
            style={{ objectFit: fit }}
          />
        </div>
      </div>
      <div ref={ctl}>
        {n > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex items-center justify-center gap-4 font-mono text-12 text-white [&>*]:pointer-events-auto">
            <IconButton
              className={darkIconButton}
              aria-label="이전 이미지"
              onClick={() => step(-1)}
            >
              <Icon name="chevLeft" />
            </IconButton>
            <span>
              {i + 1} / {n}
            </span>
            <IconButton
              className={darkIconButton}
              aria-label="다음 이미지"
              onClick={() => step(1)}
            >
              <Icon name="chevRight" />
            </IconButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

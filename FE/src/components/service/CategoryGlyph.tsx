import type { ReactNode } from "react";

/* 카테고리 기본 이미지 글리프 (인라인 SVG) */
const CAT_GLYPH: Record<string, ReactNode> = {
  play: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="5" />
      <path d="M8 10v4M6 12h4" />
      <circle cx="15.5" cy="11" r="1" />
      <circle cx="17.5" cy="13" r="1" />
    </>
  ),
  life: (
    <>
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  learn: (
    <>
      <path d="M3 8l9-4 9 4-9 4z" />
      <path d="M7 10v5c2 2 8 2 10 0v-5" />
    </>
  ),
  prod: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
      <path d="M8 14l2 2 4-4" />
    </>
  ),
  design: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-1-.8-1.4-.8-2.4 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.6-4-8.4-9-8.4z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="14.5" cy="7" r="1" />
    </>
  ),
  util: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />
    </>
  ),
  dev: (
    <>
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" />
    </>
  ),
  etc: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
};
export function CategoryGlyph({
  cat,
  size = 24,
  color,
}: {
  cat: string;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CAT_GLYPH[cat] || CAT_GLYPH.etc}
    </svg>
  );
}

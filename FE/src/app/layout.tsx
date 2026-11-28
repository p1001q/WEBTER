import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  shareMetadata,
} from "@/lib/shareMetadata";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: SITE_URL } : {}),
  ...(process.env.SITE_NOINDEX === "true" ? { robots: { index: false } } : {}),
  title: {
    default: SITE_TITLE,
    template: "%s | WEBTER",
  },
  description: SITE_DESCRIPTION,
  ...shareMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION }),
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 요청별 nonce가 정적 HTML·공유 캐시에 재사용되지 않도록 요청 시 렌더링한다.
  await connection();
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

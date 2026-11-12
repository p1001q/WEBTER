import type { Metadata } from "next";
import type { ReactNode } from "react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: SITE_URL } : {}),
  robots: { index: false },
  title: {
    default: "WEBTER | 웹이 모이는 터, 웹터",
    template: "%s | WEBTER",
  },
  description:
    "개발자가 만든 웹 서비스를 발견하고, 설치 없이 이용하며 리뷰와 반응을 나누는 웹 서비스 스토어.",
  openGraph: {
    type: "website",
    siteName: "WEBTER",
    locale: "ko_KR",
    title: "WEBTER | 웹이 모이는 터, 웹터",
    description:
      "개발자가 만든 웹 서비스를 발견하고, 설치 없이 이용하며 리뷰와 반응을 나누는 웹 서비스 스토어.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

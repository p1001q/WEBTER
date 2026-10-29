import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WEBTER | 웹에서 놀다, 웹터",
    template: "%s | WEBTER",
  },
  description:
    "개발자가 만든 웹 서비스를 발견하고, 설치 없이 이용하며 리뷰와 반응을 나누는 웹 서비스 스토어.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "개인정보 취급 방침" };

// 약관 원문을 서버에서 읽으므로 빌드 시점에 굳히지 않는다
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}

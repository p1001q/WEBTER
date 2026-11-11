import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "이용약관" };

// 약관 원문을 서버에서 읽으므로 빌드 시점에 굳히지 않는다
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <LegalDocument kind="terms" />;
}

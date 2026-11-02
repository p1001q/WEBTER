import type { Metadata } from "next";
import { oneOf } from "@/lib/query";
import { AuthGate } from "../_components/AuthGate";
import { MyPageScreen } from "./_components/MyPageScreen";
import { MYPAGE_TABS } from "./tabs";

export const metadata: Metadata = { title: "마이페이지" };

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = oneOf((await searchParams).tab, MYPAGE_TABS) ?? "services";
  return (
    <AuthGate>
      <MyPageScreen key={tab} tab={tab} />
    </AuthGate>
  );
}

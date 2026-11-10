import type { Metadata } from "next";
import { AdminScreen } from "./_components/AdminScreen";

export const metadata: Metadata = { title: "관리자 페이지" };

export default function AdminPage() {
  return <AdminScreen />;
}

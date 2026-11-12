import type { Metadata } from "next";
import { AuthGate } from "../_components/AuthGate";
import { ManageScreen } from "./_components/ManageScreen";

export const metadata: Metadata = { title: "내 서비스 관리" };

export default function ManagePage() {
  return (
    <AuthGate>
      <ManageScreen />
    </AuthGate>
  );
}

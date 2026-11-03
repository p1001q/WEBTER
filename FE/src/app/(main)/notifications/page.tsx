import type { Metadata } from "next";
import { AuthGate } from "../_components/AuthGate";
import { NotificationsScreen } from "./_components/NotificationsScreen";

export const metadata: Metadata = { title: "알림" };

export default function NotificationsPage() {
  return (
    <AuthGate>
      <NotificationsScreen />
    </AuthGate>
  );
}

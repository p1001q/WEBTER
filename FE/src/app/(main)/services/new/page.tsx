import type { Metadata } from "next";
import { AuthGate } from "../../_components/AuthGate";
import { ServiceForm } from "../_components/ServiceForm";

export const metadata: Metadata = { title: "서비스 등록" };

export default function RegisterPage() {
  return (
    <AuthGate>
      <ServiceForm mode="new" />
    </AuthGate>
  );
}

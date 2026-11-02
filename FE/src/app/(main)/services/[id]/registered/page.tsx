import type { Metadata } from "next";
import { AuthGate } from "../../../_components/AuthGate";
import { RegisteredScreen } from "./_components/RegisteredScreen";

export const metadata: Metadata = { title: "서비스 등록 완료" };

export default async function RegisteredPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthGate>
      <RegisteredScreen key={id} id={id} />
    </AuthGate>
  );
}

import type { Metadata } from "next";
import { AuthGate } from "../../../_components/AuthGate";
import { ServiceForm } from "../../_components/ServiceForm";

export const metadata: Metadata = { title: "서비스 수정" };

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthGate>
      <ServiceForm key={id} mode="edit" id={id} />
    </AuthGate>
  );
}

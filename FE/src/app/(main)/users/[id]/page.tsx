import type { Metadata } from "next";
import { realAuth } from "@/api/auth/config";
import { fetchProfileMeta, profileMetadata } from "@/api/real/profileMeta";
import { ProfileScreen } from "./_components/ProfileScreen";

/** 링크를 공유했을 때 보이는 닉네임·소개·프로필 사진(OG). 목업이거나 없는 사용자면 기본 값을 쓴다 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!realAuth) return {};
  const { id } = await params;
  const meta = await fetchProfileMeta(id);
  return meta ? profileMetadata(id, meta) : {};
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfileScreen key={id} id={id} />;
}

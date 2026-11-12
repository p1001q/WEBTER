import type { Metadata } from "next";
import { realAuth } from "@/api/auth/config";
import { fetchServiceMeta, serviceMetadata } from "@/api/real/serviceMeta";
import { oneOf } from "@/lib/query";
import { ServiceDetailScreen } from "./_components/ServiceDetailScreen";

/** 링크를 공유했을 때 보이는 이름·소개·썸네일(OG). 목업이거나 공개 서비스가 아니면 기본 값을 쓴다 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!realAuth) return {};
  const { id } = await params;
  const meta = await fetchServiceMeta(id);
  return meta ? serviceMetadata(id, meta) : {};
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const tab = oneOf((await searchParams).tab, [
    "about",
    "reviews",
    "comments",
  ] as const);
  return <ServiceDetailScreen key={`${id}|${tab}`} id={id} tab={tab} />;
}

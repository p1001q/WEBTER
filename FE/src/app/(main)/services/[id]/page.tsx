import { oneOf } from "@/lib/query";
import { ServiceDetailScreen } from "./_components/ServiceDetailScreen";

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const tab = oneOf((await searchParams).tab, ["about", "reviews"] as const);
  return <ServiceDetailScreen key={`${id}|${tab}`} id={id} tab={tab} />;
}

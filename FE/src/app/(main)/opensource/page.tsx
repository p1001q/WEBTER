import { oneOf } from "@/lib/query";
import { OpenSourceScreen } from "./_components/OpenSourceScreen";

export default async function OpenSourcePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const sp = await searchParams;
  const tab = oneOf(sp.tab, ["trending", "popular", "latest"] as const);
  return <OpenSourceScreen key={tab} tab={tab} />;
}

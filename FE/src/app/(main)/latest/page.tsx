import { categoryParam } from "@/lib/query";

import { RankedListScreen } from "../_components/RankedListScreen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  const sp = await searchParams;
  const cat = categoryParam(sp.cat);
  return <RankedListScreen key={cat} kind="latest" cat={cat} />;
}

import { categoryParam, oneOf } from "@/lib/query";
import { RankedListScreen } from "../_components/RankedListScreen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string | string[];
    period?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const cat = categoryParam(sp.cat);
  const period = oneOf(sp.period, ["w", "m", "all"] as const);
  return (
    <RankedListScreen
      key={`${cat}|${period}`}
      kind="popular"
      cat={cat}
      period={period}
    />
  );
}

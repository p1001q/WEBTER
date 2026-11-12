import { firstParam } from "@/lib/query";
import { SearchScreen } from "./_components/SearchScreen";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q) ?? "";
  return <SearchScreen key={q} q={q} />;
}

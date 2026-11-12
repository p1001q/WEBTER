import { firstParam } from "@/lib/query";
import { OnboardingScreen } from "./_components/OnboardingScreen";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ back?: string | string[]; step?: string | string[] }>;
}) {
  const sp = await searchParams;
  const back = firstParam(sp.back);
  const step = Math.trunc(Number(firstParam(sp.step))) || 1;
  return (
    <OnboardingScreen
      key={`${back}|${step}`}
      back={back}
      step={Math.min(Math.max(step, 1), 3)}
    />
  );
}

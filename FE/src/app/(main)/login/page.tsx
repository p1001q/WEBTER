import { firstParam } from "@/lib/query";
import { LoginScreen } from "./_components/LoginScreen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    back?: string | string[];
    error?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const back = firstParam(sp.back);
  const error = firstParam(sp.error);
  return <LoginScreen key={`${back}|${error}`} back={back} error={error} />;
}

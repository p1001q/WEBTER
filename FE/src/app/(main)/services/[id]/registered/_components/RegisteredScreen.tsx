"use client";

import { Footer } from "@/components/layout/Footer";
import { Restricted } from "@/components/layout/Restricted";
import { ServiceCard } from "@/components/service/ServiceCard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { POLICY } from "@/domain/policy";
import { useWt } from "@/providers/context";

/** 서비스 등록 완료 안내 */
export function RegisteredScreen({ id }: { id: string }) {
  const wt = useWt();
  const s = wt.svc(id);
  if (!s || s.owner !== wt.me?.id)
    return <Restricted title="서비스를 찾을 수 없어요" />;
  return (
    <>
      <div className="page-wrap">
        <div
          className="mx-auto mt-[72px] flex max-w-[560px] flex-col items-center gap-4 text-center"
          data-component="register-done"
        >
          <span className="grid size-14 place-items-center rounded-full bg-navy-50 text-navy">
            <Icon name="check" size={26} stroke={2.2} />
          </span>
          <h1 className="m-0 text-28 font-extrabold tracking-[-0.02em]">
            서비스를 등록했어요
          </h1>
          <p className="m-0 text-text-2">
            등록한 서비스는 바로 공개돼요. 오늘{" "}
            {Math.max(POLICY.dailyRegisterLimit - wt.todayCount, 0)}개를 더
            등록할 수 있어요.
          </p>
          <div className="w-[300px] text-left">
            <ServiceCard s={s} heading="h2" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={() => wt.go("detail", { id: s.id })}>
              등록한 서비스 보기
            </Button>
            <Button variant="ghost" size="lg" onClick={() => wt.go("manage")}>
              내 서비스 관리로 이동
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

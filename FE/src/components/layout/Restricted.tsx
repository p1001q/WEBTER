"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useWt } from "@/providers/context";
import { Footer } from "./Footer";

const box =
  "mx-auto my-24 flex max-w-[520px] flex-col items-center gap-3 text-center [&_h1]:m-0 [&_h1]:text-[24px] [&_h1]:font-extrabold [&_p]:m-0 [&_p]:text-text-2";

/** 볼 수 없는 페이지(삭제·비공개·없는 주소) 안내 */
export function Restricted({
  title = "볼 수 없는 페이지예요",
  desc = "삭제되었거나 비공개 처리된 서비스예요. 주소를 다시 확인해 주세요.",
}: {
  title?: string;
  desc?: string;
}) {
  const wt = useWt();
  return (
    <>
      <div className="page-wrap">
        <div className={box}>
          <span className="grid size-14 place-items-center rounded-full bg-light">
            <Icon name="lock" size={24} />
          </span>
          <h1>{title}</h1>
          <p>{desc}</p>
          <Button onClick={() => wt.go("home")}>홈으로 가기</Button>
        </div>
      </div>
      <Footer />
    </>
  );
}

/** 화면을 그리다 오류가 났을 때(헤더·푸터는 그대로 두고 본문 자리에 보여 준다) */
export function ErrorNotice({ onRetry }: { onRetry: () => void }) {
  const wt = useWt();
  return (
    <>
      <div className="page-wrap">
        <div className={box} role="alert">
          <span className="grid size-14 place-items-center rounded-full bg-wine-50 text-wine">
            <Icon name="alert" size={24} />
          </span>
          <h1>화면을 표시하지 못했어요</h1>
          <p>
            일시적인 문제일 수 있어요. 다시 시도해 보고, 계속되면 새로고침하거나
            잠시 뒤에 이용해 주세요.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => wt.go("home")}>
              홈으로 가기
            </Button>
            <Button onClick={onRetry}>다시 시도</Button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export const NotFoundNotice = () => (
  <Restricted
    title="페이지를 찾을 수 없어요"
    desc="주소가 잘못되었거나 이동된 페이지예요."
  />
);

/** 로그인이 필요한 화면에 비회원이 들어왔을 때 */
export function LoginGate() {
  const wt = useWt();
  return (
    <div className="page-wrap">
      <div className={box}>
        <span className="grid size-14 place-items-center rounded-full bg-butter-50 text-butter-ink">
          <Icon name="user" size={24} />
        </span>
        <h1>로그인이 필요한 페이지예요</h1>
        <p>로그인하면 이 페이지로 바로 돌아와요.</p>
        <Button onClick={() => wt.go("login", { back: wt.currentPath() })}>
          로그인하기
        </Button>
      </div>
    </div>
  );
}

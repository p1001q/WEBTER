import { AppFrame } from "@/components/layout/AppFrame";
import { NotFoundNotice } from "@/components/layout/Restricted";

/**
 * 정의되지 않은 주소. Next 는 페이지가 던지는 notFound() 를 서버에서 빈 문서로 내보내지만(16.4.3 확인),
 * 매칭되지 않는 주소는 이 파일을 서버에서 그대로 렌더링한다. 그래서 셸까지 여기서 직접 그린다.
 */
export default function NotFound() {
  return (
    <AppFrame>
      <main className="animate-enter">
        <NotFoundNotice />
      </main>
    </AppFrame>
  );
}

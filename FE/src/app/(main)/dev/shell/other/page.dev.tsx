import { NavTests } from "@/dev/NavTests";

/** 화면 이동에서도 상태(로그인·좋아요·토스트 등)가 이어지는지 확인하는 두 번째 개발용 화면 */
export default function DevShellOtherPage() {
  return (
    <div className="page-wrap pt-6">
      <h1 className="m-0 text-28 font-extrabold">다른 화면</h1>
      <NavTests />
    </div>
  );
}

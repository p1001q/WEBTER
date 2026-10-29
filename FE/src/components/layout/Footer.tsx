import { RouteLink } from "@/components/ui/RouteLink";
import { Wordmark } from "./Wordmark";

const link = "font-semibold text-ink hover:underline";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border pt-8 pb-12 text-13 text-muted">
      <div className="page-wrap flex flex-wrap items-start gap-6">
        <div className="flex-[1_1_260px]">
          <Wordmark size={18} />
          <div className="mt-2.5 font-semibold text-ink">
            웹에서 놀다, 웹터.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <RouteLink to="terms" className={link}>
              이용약관
            </RouteLink>
            <RouteLink to="privacy" className={link}>
              개인정보 취급 방침
            </RouteLink>
          </div>
          <div>
            문의 <span className="font-mono">tndus10@skuniv.ac.kr</span> (임시)
          </div>
        </div>
        <div className="w-full text-12">
          표시되는 서비스·사용자·수치는 모두 가상의 샘플 데이터입니다.
        </div>
      </div>
    </footer>
  );
}

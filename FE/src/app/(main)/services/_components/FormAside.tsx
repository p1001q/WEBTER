import type { Service } from "@/api/types";
import { ServiceCard } from "@/components/service/ServiceCard";
import { Icon } from "@/components/ui/Icon";
import { boxClass } from "@/components/ui/box";
import { helpClass } from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { stickyAsideClass } from "../../_components/formStyles";

/** 서비스 폼 오른쪽: 카드 미리보기와 필수 항목 진행 */
export function FormAside({
  preview,
  required,
}: {
  preview: Service;
  /** [항목 이름, 채웠는지] */
  required: [string, boolean][];
}) {
  const done = required.filter((r) => r[1]).length;
  return (
    <aside>
      <div className={stickyAsideClass}>
        <div className={cx(helpClass, "font-bold")}>카드 미리보기</div>
        <div className="pointer-events-none" inert>
          <ServiceCard s={preview} />
        </div>
        <div
          className={`${boxClass} flex flex-col gap-2.5 px-[18px] py-4`}
          data-component="required-progress"
        >
          <div className="flex justify-between text-13">
            <b>필수 항목</b>
            <span className="font-mono">
              {done}/{required.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-light">
            <i
              className="block h-full bg-navy"
              style={{ width: (done / required.length) * 100 + "%" }}
            />
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-13">
            {required.map(([l, ok]) => (
              <li
                key={l}
                className={cx(
                  "flex items-center gap-2",
                  ok ? "text-ink [&_svg]:text-navy" : "text-muted",
                )}
              >
                <Icon name={ok ? "check" : "minus"} size={14} stroke={2.2} />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

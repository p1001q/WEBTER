import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { DraftStatus } from "./useRegistrationDraft";

export function DraftSaveButton({
  status,
  automatic,
  disabled,
  onSave,
}: {
  status: DraftStatus;
  automatic: boolean;
  disabled: boolean;
  onSave: () => void;
}) {
  const saved = status === "saved";
  return (
    <div className="relative">
      <span
        aria-hidden={!saved}
        role="status"
        className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-0 text-11 whitespace-nowrap text-muted transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}
      >
        {automatic ? "자동 임시 저장 됐습니다." : "임시 저장 됐습니다."}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="min-w-[100px]"
        disabled={disabled || status === "saving"}
        aria-label={saved ? "임시 저장 완료" : "임시 저장"}
        aria-busy={status === "saving"}
        onClick={onSave}
      >
        {status === "saving" ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-muted border-t-transparent"
            aria-hidden="true"
          />
        ) : saved ? (
          <Icon name="check" size={17} />
        ) : (
          "임시 저장"
        )}
      </Button>
    </div>
  );
}

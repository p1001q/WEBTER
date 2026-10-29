import type { User } from "@/api/types";
import { Icon } from "./Icon";

const base =
  "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-ink/6 font-bold text-ink";

export function Avatar({
  user,
  size = 32,
}: {
  user: User | null | undefined;
  size?: number;
}) {
  if (!user)
    return (
      <span
        className={`${base} bg-light text-muted`}
        style={{ width: size, height: size }}
      >
        <Icon name="user" size={size * 0.55} />
      </span>
    );
  return (
    <span
      className={base}
      style={{
        width: size,
        height: size,
        background: user.color,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {user.avatarImg ? (
        // 사용자가 올린 이미지의 크기·출처를 알 수 없어 next/image 최적화를 쓰지 않는다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarImg} alt="" className="size-full object-cover" />
      ) : (
        user.nick[0]
      )}
    </span>
  );
}

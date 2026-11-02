import type { User } from "@/api/types";
import { Icon } from "./Icon";
import { SafeImg } from "./SafeImg";

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
        <SafeImg
          src={user.avatarImg}
          className="size-full object-cover"
          fallback={user.nick[0]}
        />
      ) : (
        user.nick[0]
      )}
    </span>
  );
}

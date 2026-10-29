import Link from "next/link";

export function Wordmark({
  onClick,
  size,
}: {
  onClick?: () => void;
  size?: number;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="WEBTER 홈"
      className="inline-flex items-baseline text-22 leading-none font-extrabold tracking-[-0.02em] text-ink select-none @max-[560px]/app:text-20"
      style={size ? { fontSize: size } : undefined}
    >
      WEB<span className="font-medium text-navy">TER</span>
      <span
        className="mb-0.5 ml-[3px] size-1.5 self-end rounded-full border border-ink/8 bg-butter"
        aria-hidden="true"
      />
    </Link>
  );
}

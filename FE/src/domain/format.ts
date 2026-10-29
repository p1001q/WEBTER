export const fmt = (n: number) =>
  n >= 10000
    ? (n / 10000).toFixed(1).replace(".0", "") + "만"
    : n >= 1000
      ? (n / 1000).toFixed(1).replace(".0", "") + "k"
      : String(n);
export const fmtNum = (n: number) => n.toLocaleString("ko-KR");
export const fmtDate = (d: string) => {
  const [y, m, dd] = d.split("-");
  return `${y}.${m}.${dd}`;
};

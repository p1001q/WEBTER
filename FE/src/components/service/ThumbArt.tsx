import type { CSSProperties, ReactNode } from "react";
import type { Service } from "@/api/types";

/* WEBTER — 가상 웹 서비스 스크린샷(CSS 구성 목업, 실제 서비스 화면 아님). 크기는 썸네일 틀의 너비(cqw)를 따른다 */

const tq = (n: number) => n + "cqw";
const TB = ({
  w = "40%",
  h = 2.2,
  c = "#E7E5DF",
  r = 1,
  style,
}: {
  w?: string;
  h?: number;
  c?: string;
  r?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width: w,
      height: tq(h),
      background: c,
      borderRadius: tq(r),
      ...style,
    }}
  />
);
const TT = ({
  children,
  size = 4,
  w = 800,
  c = "#242424",
  style,
}: {
  children: ReactNode;
  size?: number;
  w?: number;
  c?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontSize: tq(size),
      fontWeight: w,
      color: c,
      letterSpacing: "-0.02em",
      lineHeight: 1.15,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

export function ThumbArt({
  s,
  v = 0,
}: {
  s: Pick<Service, "thumb">;
  v?: number;
}) {
  const t = s.thumb;
  const a = t.a,
    b = t.b;
  const colors = t.colors ?? [];
  const pad: CSSProperties = { position: "absolute", inset: 0, padding: tq(4) };
  switch (t.kind) {
    case "game":
      return (
        <div
          style={{
            ...pad,
            background: "#F6FAF3",
            display: "flex",
            flexDirection: "column",
            gap: tq(2.4),
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TT size={3.6} c={a}>
              둘이서 한 판
            </TT>
            <TB w="18%" h={3.4} c={b} r={2} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: tq(2),
              flex: 1,
            }}
          >
            {[a, null, "#823F43"].map((c, i) =>
              c ? (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1px solid #E3EADF",
                    borderRadius: tq(2),
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: tq(10),
                      height: tq(10),
                      borderRadius: "50%",
                      background: c,
                      opacity: 0.9,
                    }}
                  />
                  <TT size={5.5} c="#242424">
                    {i === 0 ? (v ? 3 : 2) : 1}
                  </TT>
                </div>
              ) : (
                <TT key={i} size={3} c="#858585" w={600}>
                  VS
                </TT>
              ),
            )}
          </div>
          <div style={{ display: "flex", gap: tq(1.5) }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <TB key={i} w="20%" h={2.4} c={i < 3 ? a : "#E3EADF"} />
            ))}
          </div>
        </div>
      );
    case "study":
      return (
        <div
          style={{
            ...pad,
            background: "#FAFBFA",
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: tq(3),
          }}
        >
          <div
            style={{
              background: "#EEF3F2",
              borderRadius: tq(1.6),
              padding: tq(2.4),
              display: "flex",
              flexDirection: "column",
              gap: tq(1.4),
            }}
          >
            <TT size={2.6} c={a}>
              핵심 개념
            </TT>
            {[90, 70, 84, 60, 76].map((w, i) => (
              <TB key={i} w={w + "%"} h={1.6} c="#CFDDDA" />
            ))}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: tq(1.6) }}
          >
            <TT size={2.8}>Q{v + 3}. 다음 중 옳은 것은?</TT>
            {["①", "②", "③", "④"].map((n, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: tq(1.2),
                  alignItems: "center",
                  padding: tq(1.2),
                  borderRadius: tq(1.2),
                  border: "1px solid " + (i === 1 ? a : "#E7E5DF"),
                  background: i === 1 ? "#E2ECEB" : "#fff",
                }}
              >
                <TT size={2.2} w={600} c={i === 1 ? a : "#858585"}>
                  {n}
                </TT>
                <TB
                  w={50 + i * 9 + "%"}
                  h={1.4}
                  c={i === 1 ? "#9EBDBA" : "#EEECE6"}
                />
              </div>
            ))}
          </div>
        </div>
      );
    case "calendar":
      return (
        <div
          style={{
            ...pad,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: tq(2),
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: tq(2) }}>
            <TT size={4} c={a}>
              10월 {2 + v}주
            </TT>
            <TB w="14%" h={1.6} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: tq(1),
              flex: 1,
            }}
          >
            {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
              <div
                key={d}
                style={{
                  background: i === 2 ? "#EBEEF3" : "#F7F5EF",
                  borderRadius: tq(1),
                  padding: tq(1),
                  display: "flex",
                  flexDirection: "column",
                  gap: tq(0.8),
                }}
              >
                <TT size={2} w={700} c={i > 4 ? "#823F43" : "#858585"}>
                  {d}
                </TT>
                {Array.from({ length: ((i * 3 + v) % 4) + 1 }).map((_, k) => (
                  <TB
                    key={k}
                    w="100%"
                    h={2.2}
                    c={
                      k === 0 && i % 2 === 0 ? b : k % 2 ? "#D6DDEB" : "#C7D0DE"
                    }
                    r={0.6}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "palette":
      return (
        <div
          style={{
            ...pad,
            background: "#FBF8F3",
            display: "flex",
            flexDirection: "column",
            gap: tq(2.2),
          }}
        >
          <div
            style={{
              display: "flex",
              gap: tq(1.6),
              alignItems: "center",
              border: "1px solid #E7E5DF",
              borderRadius: tq(4),
              padding: `${tq(1.2)} ${tq(2.4)}`,
              background: "#fff",
            }}
          >
            <TT size={2.8} w={500} c="#858585">
              {["가을 카페", "새벽 바다", "봄 소풍", "도서관"][v % 4]}
            </TT>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              borderRadius: tq(1.6),
              overflow: "hidden",
            }}
          >
            {(v % 2 ? [...colors].reverse() : colors).map((c) => (
              <div
                key={c}
                style={{
                  flex: 1,
                  background: c,
                  display: "flex",
                  alignItems: "flex-end",
                  padding: tq(1),
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: tq(1.7),
                    color: "rgba(255,255,255,.9)",
                    mixBlendMode: "difference",
                  }}
                >
                  {c}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "pdf":
      return (
        <div
          style={{
            ...pad,
            background: "#F6F2F1",
            display: "flex",
            gap: tq(2.4),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "20%",
                aspectRatio: "0.72",
                background: "#fff",
                borderRadius: tq(0.8),
                boxShadow: "0 .6cqw 2cqw rgba(0,0,0,.08)",
                padding: tq(1.6),
                display: "flex",
                flexDirection: "column",
                gap: tq(0.9),
                transform:
                  i === 1 + (v % 2)
                    ? "translateY(-2.5cqw) rotate(-3deg)"
                    : "none",
                outline: i === 1 + (v % 2) ? `0.5cqw solid ${a}` : "none",
              }}
            >
              <TB w="70%" h={1.6} c="#D9CFCD" />
              {[90, 80, 86, 60, 76, 50].map((w, k) => (
                <TB key={k} w={w + "%"} h={0.9} c="#EEE8E6" />
              ))}
              <div
                style={{
                  marginTop: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: tq(1.8),
                  color: "#858585",
                  textAlign: "center",
                }}
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      );
    case "typing":
      return (
        <div
          style={{
            ...pad,
            background: t.bg,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: tq(3),
            padding: tq(6),
          }}
        >
          <div style={{ display: "flex", gap: tq(4) }}>
            {[
              ["타수", 412 + v * 37],
              ["정확도", "98%"],
              ["순위", "#" + (3 + v)],
            ].map(([k, val]) => (
              <div key={k}>
                <div style={{ fontSize: tq(1.9), color: b }}>{k}</div>
                <TT size={4.4} c={a}>
                  {val}
                </TT>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: tq(4),
              fontWeight: 600,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#F7F5EF" }}>천천히 가도 </span>
            <span style={{ color: a, borderBottom: `0.5cqw solid ${a}` }}>
              괜
            </span>
            <span style={{ color: "#5a5a5a" }}>찮아, 멈추지만</span>
          </div>
          <TB w="100%" h={1} c="#3a3a3a" />
        </div>
      );
    case "api":
      return (
        <div
          style={{
            ...pad,
            background: t.bg,
            fontFamily: "var(--font-mono)",
            display: "flex",
            flexDirection: "column",
            gap: tq(1.8),
          }}
        >
          <div style={{ display: "flex", gap: tq(1.4), alignItems: "center" }}>
            <span
              style={{
                fontSize: tq(2.2),
                fontWeight: 700,
                color: "#1F2633",
                background: a,
                padding: `${tq(0.5)} ${tq(1.2)}`,
                borderRadius: tq(0.6),
              }}
            >
              {v % 2 ? "POST" : "GET"}
            </span>
            <div
              style={{
                flex: 1,
                height: tq(3.6),
                background: "#2B3445",
                borderRadius: tq(0.8),
                display: "flex",
                alignItems: "center",
                padding: `0 ${tq(1.4)}`,
                fontSize: tq(2),
                color: b,
              }}
            >
              /api/v1/services?sort=trend
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: tq(1.6),
              flex: 1,
            }}
          >
            {[0, 1].map((k) => (
              <div
                key={k}
                style={{
                  background: "#161C26",
                  borderRadius: tq(1),
                  padding: tq(1.6),
                  fontSize: tq(1.8),
                  lineHeight: 1.6,
                  color: b,
                  overflow: "hidden",
                }}
              >
                <div style={{ color: k ? "#E8A0A3" : "#9FD3A8" }}>
                  {k ? "404 Not Found" : "200 OK"} · {120 + k * 48}ms
                </div>
                <div>{"{"}</div>
                <div>
                  &nbsp;&quot;id&quot;:{" "}
                  <span style={{ color: a }}>{k ? "null" : 17}</span>,
                </div>
                <div>&nbsp;&quot;name&quot;: &quot;…&quot;,</div>
                <div>
                  &nbsp;&quot;likes&quot;:{" "}
                  <span style={{ color: a }}>{k ? 0 : 734}</span>
                </div>
                <div>{"}"}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "travel":
      return (
        <div
          style={{
            ...pad,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1.1fr",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: tq(3),
              display: "flex",
              flexDirection: "column",
              gap: tq(1.6),
            }}
          >
            <TT size={3}>
              {["강릉 1박 2일", "전주 1박 2일", "여수 1박 2일"][v % 3]}
            </TT>
            {["09:30", "12:00", "15:00", "18:30"].map((h, i) => (
              <div
                key={h}
                style={{ display: "flex", gap: tq(1.2), alignItems: "center" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: tq(1.7),
                    color: "#858585",
                  }}
                >
                  {h}
                </span>
                <div
                  style={{
                    width: tq(1.4),
                    height: tq(1.4),
                    borderRadius: "50%",
                    background: i === 1 ? b : a,
                  }}
                />
                <TB w={40 + i * 10 + "%"} h={1.5} c="#E5ECE6" />
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#DCE6DD",
              position: "relative",
              backgroundImage:
                "linear-gradient(#cfdccf 1px, transparent 1px), linear-gradient(90deg, #cfdccf 1px, transparent 1px)",
              backgroundSize: "6cqw 6cqw",
            }}
          >
            {[
              [20, 30],
              [55, 22],
              [70, 60],
              [35, 72],
            ].map(([x, y], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x + "%",
                  top: y + "%",
                  width: tq(3),
                  height: tq(3),
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: i === 1 ? "#823F43" : a,
                  border: "0.5cqw solid #fff",
                }}
              />
            ))}
          </div>
        </div>
      );
    case "books":
      return (
        <div
          style={{
            ...pad,
            background: "#FBF7EF",
            display: "flex",
            flexDirection: "column",
            gap: tq(2),
          }}
        >
          <TT size={3.2}>10월의 책장 · {5 + v}권</TT>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: tq(1),
              flex: 1,
              borderBottom: "0.8cqw solid #D8C9AE",
              paddingLeft: tq(2),
            }}
          >
            {[
              [a, 70],
              ["#35445C", 86],
              ["#C9A86A", 62],
              ["#6E8B74", 92],
              ["#242424", 74],
              [a, 80],
              ["#E8B66B", 66],
              ["#35445C", 58],
            ]
              .slice(0, 6 + v)
              .map(([c, h], i) => (
                <div
                  key={i}
                  style={{
                    width: tq(i % 3 ? 5 : 6.4),
                    height: h + "%",
                    background: c,
                    borderRadius: `${tq(0.5)} ${tq(0.5)} 0 0`,
                    opacity: 0.92,
                  }}
                />
              ))}
            <div
              style={{
                marginLeft: "auto",
                alignSelf: "center",
                background: "#fff",
                padding: tq(2),
                borderRadius: tq(1.2),
                width: "34%",
                boxShadow: "0 .5cqw 2cqw rgba(0,0,0,.06)",
              }}
            >
              <div
                style={{ fontSize: tq(2.1), color: "#555", lineHeight: 1.5 }}
              >
                “오늘 읽은 한 문장이 하루를 바꾼다.”
              </div>
            </div>
          </div>
        </div>
      );
    case "timer":
      return (
        <div
          style={{
            ...pad,
            background: "#FBF6F5",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "center",
            gap: tq(3),
          }}
        >
          <div
            style={{
              aspectRatio: "1",
              borderRadius: "50%",
              background: `conic-gradient(${a} 0 ${62 + v * 8}%, #EEDCD9 0)`,
              display: "grid",
              placeItems: "center",
              width: "82%",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "80%",
                aspectRatio: "1",
                borderRadius: "50%",
                background: "#FBF6F5",
                display: "grid",
                placeItems: "center",
              }}
            >
              <TT size={5.6} c={a} style={{ fontFamily: "var(--font-mono)" }}>
                {v ? "04:12" : "17:42"}
              </TT>
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: tq(1.4) }}
          >
            <TT size={2.6}>이번 주 집중</TT>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: tq(1),
                height: tq(16),
              }}
            >
              {[40, 72, 55, 90, 30, 64, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: h + "%",
                    background: i === 3 ? a : "#E8D3CF",
                    borderRadius: tq(0.5),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    case "poll":
      return (
        <div
          style={{
            ...pad,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: tq(1.8),
          }}
        >
          <TT size={3.2}>
            {["다음 회식 장소는?", "발표 순서 정하기", "동아리 MT 날짜"][v % 3]}
          </TT>
          {[
            [68, "삼겹살"],
            [22, "파스타"],
            [10, "마라탕"],
          ].map(([p, l], i) => (
            <div
              key={l}
              style={{
                position: "relative",
                height: tq(5),
                background: "#F1F1EE",
                borderRadius: tq(1),
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: p + "%",
                  background: i === 0 ? a : "#C7D0DE",
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "100%",
                  padding: `0 ${tq(1.6)}`,
                  fontSize: tq(2.2),
                  fontWeight: 700,
                  color: i === 0 ? "#fff" : "#242424",
                }}
              >
                <span>{l}</span>
                <span
                  style={{ color: "#242424", fontFamily: "var(--font-mono)" }}
                >
                  {p}%
                </span>
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: tq(1),
              alignItems: "center",
              marginTop: "auto",
            }}
          >
            <div
              style={{
                width: tq(1.4),
                height: tq(1.4),
                borderRadius: "50%",
                background: "#823F43",
              }}
            />
            <span style={{ fontSize: tq(1.8), color: "#858585" }}>
              실시간 · 42명 참여
            </span>
          </div>
        </div>
      );
    case "image":
      return (
        <div
          style={{
            ...pad,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          {[0, 1].map((k) => (
            <div
              key={k}
              style={{
                position: "relative",
                background: k
                  ? "repeating-conic-gradient(#EEECE6 0 25%, #fff 0 50%) 0 0 / 4cqw 4cqw"
                  : "#C9B79A",
                display: "grid",
                placeItems: "center",
              }}
            >
              {!k && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg,#B9C7B4 0 55%, #A99A7E 55%)",
                  }}
                />
              )}
              <div
                style={{
                  position: "relative",
                  width: "42%",
                  aspectRatio: "0.8",
                  borderRadius: "45% 45% 12% 12%",
                  background: v % 2 ? "#823F43" : a,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: tq(1.6),
                  left: tq(1.6),
                  fontSize: tq(1.8),
                  fontWeight: 700,
                  background: "#fff",
                  padding: `${tq(0.4)} ${tq(1)}`,
                  borderRadius: tq(0.6),
                }}
              >
                {k ? "배경 제거" : "원본"}
              </span>
            </div>
          ))}
        </div>
      );
    case "puzzle":
      return (
        <div
          style={{
            ...pad,
            background: "#FBF7EC",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: tq(3),
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: tq(0.6),
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const owner = [a, b, "#6E8B74", null][(i * 7 + v) % 4];
              return (
                <div
                  key={i}
                  style={{
                    background: owner || "#EDE6D3",
                    borderRadius: tq(0.8),
                    opacity: owner ? 0.9 : 1,
                    border: owner ? "none" : "0.4cqw dashed #D8CDB2",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: tq(1.4),
              justifyContent: "center",
            }}
          >
            {[
              [a, "나"],
              [b, "보리"],
              ["#6E8B74", "키위"],
            ].map(([c, n]) => (
              <div
                key={n}
                style={{ display: "flex", alignItems: "center", gap: tq(1.2) }}
              >
                <div
                  style={{
                    width: tq(3.4),
                    height: tq(3.4),
                    borderRadius: "50%",
                    background: c,
                  }}
                />
                <TT size={2.4} w={600}>
                  {n}
                </TT>
              </div>
            ))}
          </div>
        </div>
      );
    case "board": {
      const stones =
        v % 2
          ? [
              [3, 3, 1],
              [4, 4, 0],
              [4, 3, 1],
              [5, 5, 0],
              [3, 5, 1],
              [2, 4, 0],
            ]
          : [
              [2, 2, 1],
              [3, 3, 0],
              [3, 2, 1],
              [4, 4, 0],
              [4, 2, 1],
              [5, 5, 0],
              [2, 5, 1],
            ];
      return (
        <div
          style={{
            ...pad,
            background: t.bg,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "48%",
              aspectRatio: "1",
              background: b,
              position: "relative",
              backgroundImage:
                "linear-gradient(#8a7346 1px, transparent 1px), linear-gradient(90deg, #8a7346 1px, transparent 1px)",
              backgroundSize: "12.5% 12.5%",
              boxShadow: "0 1cqw 3cqw rgba(0,0,0,.15)",
            }}
          >
            {stones.map(([x, y, w], i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x * 12.5 + "%",
                  top: y * 12.5 + "%",
                  width: "10%",
                  aspectRatio: "1",
                  borderRadius: "50%",
                  transform: "translate(-50%,-50%)",
                  background: w ? "#F7F5EF" : "#242424",
                  boxShadow: "0 .3cqw .6cqw rgba(0,0,0,.25)",
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    case "flash":
      return (
        <div
          style={{
            ...pad,
            background: "#F7F8F1",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ position: "relative", width: "56%", height: "72%" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#E3E6D3",
                borderRadius: tq(2),
                transform: "rotate(4deg) translate(2cqw, 1cqw)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#fff",
                borderRadius: tq(2),
                boxShadow: "0 1cqw 3cqw rgba(0,0,0,.08)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <div>
                <TT
                  size={5.4}
                  c={a}
                  style={{ fontFamily: "Georgia, serif", fontWeight: 600 }}
                >
                  {["serendipity", "resilient", "meticulous"][v % 3]}
                </TT>
                <div
                  style={{
                    fontSize: tq(2),
                    color: "#858585",
                    marginTop: tq(1),
                  }}
                >
                  탭해서 뜻 보기
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case "code":
      return (
        <div
          style={{
            ...pad,
            background: "linear-gradient(135deg,#C7D0DE,#E3DFD3)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "76%",
              background: b,
              borderRadius: tq(1.6),
              padding: tq(2.4),
              fontFamily: "var(--font-mono)",
              fontSize: tq(2.1),
              lineHeight: 1.7,
              color: "#C7D0DE",
              boxShadow: "0 1.4cqw 4cqw rgba(0,0,0,.2)",
            }}
          >
            <div
              style={{ display: "flex", gap: tq(0.9), marginBottom: tq(1.4) }}
            >
              {["#823F43", "#F2DB94", "#6E8B74"].map((c) => (
                <i
                  key={c}
                  style={{
                    width: tq(1.4),
                    height: tq(1.4),
                    borderRadius: "50%",
                    background: c,
                    display: "block",
                  }}
                />
              ))}
            </div>
            <div>
              <span style={{ color: "#F2DB94" }}>const</span> play = () =&gt;{" "}
              {"{"}
            </div>
            <div>
              &nbsp;&nbsp;return{" "}
              <span style={{ color: "#E8B66B" }}>&apos;웹에서 놀다&apos;</span>;
            </div>
            <div>{"}"}</div>
          </div>
        </div>
      );
    case "roulette":
      return (
        <div
          style={{
            ...pad,
            background: "#FBF6E6",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "42%",
              aspectRatio: "1",
              borderRadius: "50%",
              background: `conic-gradient(${a} 0 25%, #F2DB94 0 50%, ${b} 0 75%, #E8DCC2 0)`,
              border: "1cqw solid #fff",
              boxShadow: "0 1cqw 3cqw rgba(0,0,0,.1)",
            }}
          />
        </div>
      );
    default:
      return <div>service shot</div>;
  }
}

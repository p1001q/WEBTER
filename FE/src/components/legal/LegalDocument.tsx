import { Footer } from "@/components/layout/Footer";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { fetchPolicyContent } from "@/api/real/policyApi";
import { realAuth } from "@/api/auth/config";
import { DOCS } from "./docs";
import { parseLegalMarkdown, type Block, type Inline } from "./markdown";

interface LegalContent {
  title: string;
  version: string;
  effectiveAt: string | null;
  markdown: string;
}

/** 서버가 있으면 DB의 현재 원문을, 없으면(목업) 간략 초안을 쓴다. 서버를 읽지 못하면 null */
async function load(kind: "terms" | "privacy"): Promise<LegalContent | null> {
  if (realAuth) {
    const p = await fetchPolicyContent(kind);
    return p && { ...p, markdown: p.content };
  }
  const d = DOCS[kind];
  return {
    title: d.title,
    version: "draft",
    effectiveAt: null,
    markdown: d.sections
      .map(([t, body], i) => `## 제${i + 1}조 ${t}\n\n${body}`)
      .join("\n\n"),
  };
}

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) =>
    p.kind === "bold" ? (
      <strong key={i}>{p.text}</strong>
    ) : p.kind === "code" ? (
      <code
        key={i}
        className="rounded-xs bg-light px-1 font-mono text-[0.92em]"
      >
        {p.text}
      </code>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

const body = "m-0 mt-2 text-15 leading-[1.75] text-[#3a3a3a]";

function BlockView({ block, anchor }: { block: Block; anchor?: string }) {
  switch (block.kind) {
    case "heading":
      return (
        <h2
          id={anchor}
          className="mt-8 mb-0 scroll-mt-20 text-16 font-extrabold"
        >
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className={body}>
          <Inlines parts={block.inline} />
        </p>
      );
    case "quote":
      return (
        <p className="m-0 mt-4 border-l-2 border-border pl-3 text-14 leading-[1.7] text-muted">
          <Inlines parts={block.inline} />
        </p>
      );
    case "list":
      return (
        <ul className={`${body} list-disc pl-5`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inlines parts={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-14 leading-[1.6]">
            <thead>
              <tr>
                {block.head.map((c, i) => (
                  <th
                    key={i}
                    className="border border-border bg-light px-3 py-2 text-left font-bold"
                  >
                    <Inlines parts={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((c, i) => (
                    <td key={i} className="border border-border px-3 py-2">
                      <Inlines parts={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** 이용약관·개인정보처리방침. 목차는 같은 화면의 조항으로 이동한다 */
export async function LegalDocument({ kind }: { kind: "terms" | "privacy" }) {
  const doc = await load(kind);
  const blocks = doc ? parseLegalMarkdown(doc.markdown) : [];
  const anchors = new Map<number, string>();
  let n = 0;
  blocks.forEach((b, i) => {
    if (b.kind === "heading") anchors.set(i, `${kind}-s${++n}`);
  });
  const draft = !doc || doc.version.startsWith("draft");
  // 원문이 이미 초안 안내(첫 인용)로 시작하면 같은 안내를 다시 띄우지 않는다
  const hasOwnNotice = blocks[0]?.kind === "quote";
  return (
    <>
      <div className="page-wrap">
        <div
          className="grid grid-cols-[220px_minmax(0,720px)] gap-12 pt-8 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-6"
          data-component="doc"
        >
          <nav
            className="sticky top-[88px] flex flex-col gap-0.5 self-start text-13 @max-[860px]/app:static @max-[860px]/app:flex-row @max-[860px]/app:flex-wrap"
            aria-label="조항 목차"
          >
            {blocks.map((b, i) =>
              b.kind === "heading" ? (
                <a
                  key={i}
                  href={`#${anchors.get(i)}`}
                  className="rounded-sm px-2.5 py-1.5 text-text-3 hover:bg-light hover:text-ink"
                >
                  {b.text}
                </a>
              ) : null,
            )}
          </nav>
          <article>
            {doc ? (
              <>
                <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-28 font-extrabold tracking-[-0.02em]">
                  {doc.title}{" "}
                  {draft && (
                    <span className="inline-flex h-[22px] items-center rounded-sm bg-status-temp-bg px-2 text-[11.5px] font-bold tracking-[-0.01em] whitespace-nowrap text-status-temp-fg">
                      초안(임시)
                    </span>
                  )}
                </h1>
                <div className="mt-3 flex flex-wrap gap-4 text-13 text-muted">
                  <span>
                    시행일:{" "}
                    {doc.effectiveAt
                      ? new Intl.DateTimeFormat("sv-SE", {
                          timeZone: "Asia/Seoul",
                        }).format(new Date(doc.effectiveAt))
                      : "정식 오픈 시 기재"}
                  </span>
                  <span>버전: {doc.version}</span>
                </div>
                {draft && !hasOwnNotice && (
                  <Note tone="butter" className="mt-5">
                    <Icon name="info" size={16} />
                    법적 검토 전의 초안입니다. 최종 문구는 정식 오픈 전에
                    확정됩니다.
                  </Note>
                )}
                {blocks.map((b, i) => (
                  <BlockView key={i} block={b} anchor={anchors.get(i)} />
                ))}
              </>
            ) : (
              <Note tone="wine" role="alert" className="mt-5">
                <Icon name="info" size={16} />
                문서를 불러오지 못했어요. 잠시 후 새로고침해 주세요.
              </Note>
            )}
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}

/** 약관 원문(마크다운 일부 문법)을 화면 블록으로 바꾼다. HTML은 만들지 않고 글자 조각만 돌려준다 */

export type Inline = { kind: "text" | "bold" | "code"; text: string };

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "quote"; inline: Inline[] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "table"; head: Inline[][]; rows: Inline[][][] };

/** `**굵게**`와 `` `코드` ``만 해석한다 */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    if (m.index > last)
      out.push({ kind: "text", text: src.slice(last, m.index) });
    out.push(
      m[1] !== undefined
        ? { kind: "bold", text: m[1] }
        : { kind: "code", text: m[2] },
    );
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => parseInline(c.trim()));

const isTableSeparator = (line: string) => /^\|?[\s:|-]+\|?$/.test(line.trim());

/** `##` 제목, `>` 인용, `-` 목록, `|` 표, 나머지는 문단(빈 줄로 구분) */
export function parseLegalMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length)
      blocks.push({ kind: "paragraph", inline: parseInline(para.join(" ")) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (line.trim() === "") {
      flush();
    } else if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push({ kind: "heading", text: line.replace(/^#+\s*/, "") });
    } else if (line.startsWith(">")) {
      flush();
      const quote = [line.replace(/^>\s?/, "")];
      while (i + 1 < lines.length && lines[i + 1].startsWith(">"))
        quote.push(lines[++i].replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", inline: parseInline(quote.join(" ")) });
    } else if (/^[-*]\s/.test(line)) {
      flush();
      const items = [parseInline(line.replace(/^[-*]\s+/, ""))];
      while (i + 1 < lines.length && /^[-*]\s/.test(lines[i + 1]))
        items.push(parseInline(lines[++i].replace(/^[-*]\s+/, "")));
      blocks.push({ kind: "list", items });
    } else if (
      line.startsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      flush();
      const head = cells(line);
      i++;
      const rows: Inline[][][] = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith("|"))
        rows.push(cells(lines[++i]));
      blocks.push({ kind: "table", head, rows });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

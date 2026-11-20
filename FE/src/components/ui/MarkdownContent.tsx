import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** HTML은 실행하지 않는다. 작성·미리보기·저장한 회고를 모두 같은 렌더러로 표시한다. */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="text-15 leading-[1.8] break-words [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-26 [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-22 [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-18 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-light [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-13 [&_code]:rounded-sm [&_code]:bg-light [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-light [&_th]:p-2 [&_hr]:my-6 [&_hr]:border-border [&_img]:my-4 [&_img]:max-w-full [&_input]:mr-2 [&_input]:accent-navy">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy underline underline-offset-2"
            >
              {children}
            </a>
          ),
          // 마크다운 이미지의 크기·외부 출처가 가변적이므로 원본 주소를 사용한다.
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ""} referrerPolicy="no-referrer" />
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

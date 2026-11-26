import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

const BASE =
  "text-15 leading-[1.8] break-words [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-26 [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-22 [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-18 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-light [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-13 [&_code]:rounded-sm [&_code]:bg-light [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-light [&_th]:p-2 [&_hr]:my-6 [&_hr]:border-border [&_img]:my-4 [&_img]:max-w-full [&_input]:mr-2 [&_input]:accent-navy";

/** 서비스 소개처럼 남이 쓴 글: 링크는 http(s)만 남기고 그 밖의 주소는 지운다 */
const webOnly = (url: string) =>
  /^https?:\/\//i.test(url) ? defaultUrlTransform(url) : "";

/**
 * HTML은 실행하지 않는다. 회고(작성·미리보기·저장)와 서비스 소개를 같은 렌더러로 표시한다.
 * images가 false면 이미지 문법을 표시하지 않고, 링크는 http(s)만 남긴다(정책서 4.1 상세 설명).
 */
export function MarkdownContent({
  children,
  images = true,
  className,
}: {
  children: string;
  images?: boolean;
  className?: string;
}) {
  return (
    <div className={className ? `${BASE} ${className}` : BASE}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={images ? undefined : webOnly}
        components={{
          // 허용하지 않은 주소(빈 값)는 링크 없이 글자만 보여 준다
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2"
              >
                {children}
              </a>
            ) : (
              <>{children}</>
            ),
          // 마크다운 이미지의 크기·외부 출처가 가변적이므로 원본 주소를 사용한다.
          img: ({ src, alt }) =>
            images ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ""} referrerPolicy="no-referrer" />
            ) : null,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * 이미지 주소가 깨졌을 때(삭제됨·접근 차단·형식 오류) 브라우저의 깨진 이미지 표시 대신 fallback 을 그린다.
 * 서버에서 먼저 그려진 이미지가 hydration 전에 이미 실패했다면 onError 를 받지 못하므로 로드 상태를 직접 확인한다.
 */
function useBadImage(src: string) {
  const [failed, setFailed] = useState(false);
  // 주소가 바뀌면 이전 실패는 버린다(같은 주소로 되돌아와도 다시 불러온다)
  const [seen, setSeen] = useState(src);
  if (seen !== src) {
    setSeen(src);
    setFailed(false);
  }
  const onError = () => setFailed(true);
  const attach = (el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  };
  return [failed, onError, attach] as const;
}

interface ImgProps {
  src: string;
  className?: string;
  style?: CSSProperties;
  /** 이미지를 못 불러왔을 때 대신 그릴 것 */
  fallback: ReactNode;
}

/** 이미지 한 장. 실패하면 이미지 자리에 fallback 을 그린다 */
export function SafeImg({ src, className, style, fallback }: ImgProps) {
  const [failed, onError, attach] = useBadImage(src);
  if (failed) return <>{fallback}</>;
  return (
    // 사용자가 올린 이미지의 크기·출처를 알 수 없어 next/image 최적화를 쓰지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={attach}
      src={src}
      alt=""
      className={className}
      style={style}
      onError={onError}
    />
  );
}

/** 틀(div) 안의 이미지. 실패하면 틀째로 fallback 으로 바꾼다 */
export function ImgFrame({
  src,
  frameClassName,
  frameStyle,
  imgClassName,
  imgStyle,
  fallback,
}: {
  src: string;
  frameClassName?: string;
  frameStyle?: CSSProperties;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  fallback: ReactNode;
}) {
  const [failed, onError, attach] = useBadImage(src);
  if (failed) return <>{fallback}</>;
  return (
    <div className={frameClassName} style={frameStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={attach}
        src={src}
        alt=""
        className={imgClassName}
        style={imgStyle}
        onError={onError}
      />
    </div>
  );
}

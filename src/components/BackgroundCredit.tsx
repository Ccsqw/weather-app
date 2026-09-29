import type { BackgroundImage } from '../types/weather';

/** 图库协议要求署名：作者 + 来源链接 */
export function BackgroundCredit({ image }: { image: BackgroundImage }) {
  return (
    <p className="absolute bottom-9 left-4 right-4 truncate text-[10px] leading-none text-white/45">
      {image.author ? `摄影 ${image.author}  ` : ''}
      {image.sourceUrl ? (
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/30 underline-offset-2"
        >
          Wikimedia Commons
        </a>
      ) : (
        'Wikimedia Commons'
      )}
    </p>
  );
}
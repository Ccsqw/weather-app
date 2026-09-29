import { useEffect, useRef, useState } from 'react';
import { BackgroundCredit } from './BackgroundCredit';
import { gradientOf, type WeatherTheme } from '../utils/weatherTheme';
import type { BackgroundImage } from '../types/weather';

interface Props {
  image: BackgroundImage | null;
  /** 没有照片时用的天气渐变主题 */
  theme: WeatherTheme;
}

/**
 * 背景层，三层缺一不可：
 * 1. 渐变永远铺底  图没加载出来、加载失败、没网时都是它
 * 2. 照片加载完成后淡入（避免白闪）
 * 3. 可读性遮罩  白字压在亮照片上会糊，必须压一层黑
 */
export function BackgroundLayer({ image, theme }: Props) {
  const [loaded, setLoaded] = useState(false);
  // 上一个主题：新主题淡入时垫在下面，避免颜色硬切
  const previousTheme = useRef(theme);

  useEffect(() => {
    previousTheme.current = theme;
  }, [theme]);

  // 换图先重置，否则新图会直接以 opacity-100 出现，没有淡入
  useEffect(() => setLoaded(false), [image?.url]);

  const visible = Boolean(image) && loaded;

  return (
    <>
      <div className="absolute inset-0" style={{ backgroundImage: gradientOf(previousTheme.current) }} />
      {previousTheme.current !== theme && (
        <div
          key={theme}
          className="absolute inset-0 animate-[themeFade_700ms_ease-out_both]"
          style={{ backgroundImage: gradientOf(theme) }}
        />
      )}

      {image && (
        <img
          src={image.url}
          alt=""
          aria-hidden="true"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 顶部轻、底部重，保证底部 AQI 条和页码也看得清 */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/25 via-black/30 to-black/55 transition-opacity duration-700 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 图库协议要求署名 */}
      {visible && image && <BackgroundCredit image={image} />}
    </>
  );
}
import type { WeatherIcon as WeatherIconName } from '../types/weather';

/**
 * 图标集：仿 iOS 天气
 * - 天气类（晴/云/雨/雪/雷/雾）用**彩色实心块面**，颜色本身就是信息，扫一眼就懂
 * - 工具类（搜索/时钟/日历/风/湿度/能见度/体感）用白色描边，对应 SF Symbols
 * tone="mono" 可强制单色，用于详细数据卡这类需要统一白色的地方
 */
export type IconName =
  | WeatherIconName
  | 'clock'
  | 'calendar'
  | 'wind'
  | 'humidity'
  | 'visibility'
  | 'feels-like'
  | 'search'
  | 'close'
  | 'star'
  | 'star-filled'
  | 'photo';

export type IconTone = 'color' | 'mono';

interface Props {
  name: IconName;
  className?: string;
  tone?: IconTone;
}

/** 配色：晴天黄、雨滴蓝、云和雪白、月亮浅灰 */
interface Palette {
  sun: string;
  cloud: string;
  rain: string;
  snow: string;
  bolt: string;
  moon: string;
}

const COLORED: Palette = {
  sun: '#FFD60A',
  cloud: '#FFFFFF',
  rain: '#5AC8FA',
  snow: '#EAF6FF',
  bolt: '#FFD60A',
  moon: '#F2F2F7',
};

const MONO: Palette = {
  sun: 'currentColor',
  cloud: 'currentColor',
  rain: 'currentColor',
  snow: 'currentColor',
  bolt: 'currentColor',
  moon: 'currentColor',
};

export function WeatherIcon({ name, className = 'h-5 w-5', tone = 'color' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {renderIcon(name, tone === 'mono' ? MONO : COLORED)}
    </svg>
  );
}

/** 统一线条参数 */
const LINE = {
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * 云：两个圆 + 一个圆角矩形求并集。
 * 同色实心图形叠合不露接缝，轮廓就是一朵平滑的云，不依赖手调贝塞尔曲线。
 */
function Cloud({
  color,
  offsetY = 0,
  scale = 1,
}: {
  color: string;
  offsetY?: number | string;
  scale?: number | string;
}) {
  return (
    <g
      fill={color}
      transform={`translate(12 12) scale(${scale}) translate(-12 -12) translate(0 ${offsetY})`}
    >
      <circle cx="8.6" cy="13.4" r="4.1" />
      <circle cx="14.4" cy="12.2" r="4.9" />
      <rect x="4.5" y="13" width="14.4" height="6.2" rx="3.1" />
    </g>
  );
}

function renderIcon(name: IconName, p: Palette) {
  switch (name) {
    case 'sunny':
      return (
        <>
          <circle cx="12" cy="12" r="4.9" fill={p.sun} />
          <g stroke={p.sun} {...LINE} strokeWidth="2">
            <path d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" />
          </g>
        </>
      );

    case 'night':
      return (
        <path
          d="M20.7 15.1A8.8 8.8 0 0 1 9.2 3.4a9.2 9.2 0 1 0 11.5 11.7z"
          fill={p.moon}
        />
      );

    case 'cloudy':
      // 晴间多云：太阳露在后面
      return (
        <>
          <circle cx="15.4" cy="8.6" r="4.1" fill={p.sun} />
          <Cloud color={p.cloud} offsetY="1.6" />
        </>
      );

    case 'overcast':
      return <Cloud color={p.cloud} />;

    case 'rain':
      return (
        <>
          <Cloud color={p.cloud} offsetY="-3.6" scale="0.88" />
          <g stroke={p.rain} strokeWidth="2.1" strokeLinecap="round" fill="none">
            <path d="M9.2 17.4l-1.5 3.8M13 17.4l-1.5 3.8M16.8 17.4l-1.5 3.8" />
          </g>
        </>
      );

    case 'snow':
      // 雪花用六角形，形状本身就和雨滴区分开
      return (
        <>
          <Cloud color={p.cloud} offsetY="-4" scale="0.86" />
          <g stroke={p.snow} strokeWidth="1.7" strokeLinecap="round">
            <path d="M8.4 16.6v5.2M6.15 17.9l4.5 2.6M10.65 17.9l-4.5 2.6" />
            <path d="M16.2 17.4v3.6M14.65 18.3l3.1 1.8M17.75 18.3l-3.1 1.8" />
          </g>
        </>
      );

    case 'thunder':
      return (
        <>
          <Cloud color={p.cloud} offsetY="-4" scale="0.86" />
          <path d="M13.4 14.4l-3.7 5.2h2.8l-.8 3.8 4-5.4h-2.8l.5-3.6z" fill={p.bolt} />
        </>
      );

    case 'fog':
      return (
        <>
          <Cloud color={p.cloud} offsetY="-4.4" scale="0.82" />
          <g stroke={p.cloud} strokeWidth="2" strokeLinecap="round">
            <path d="M4.4 16.4h15.2M7.2 20h10.4" />
          </g>
        </>
      );

    case 'sunset':
      return (
        <>
          <path d="M7.6 17.4a4.4 4.4 0 0 1 8.8 0z" fill={p.sun} />
          <g stroke={p.sun} {...LINE}>
            <path d="M3.4 17.4h18.2" />
            <path d="M12 4v3.4M9.9 5.3l2.1 2.1 2.1-2.1" />
          </g>
        </>
      );

    case 'sunrise':
      return (
        <>
          <path d="M7.6 17.4a4.4 4.4 0 0 1 8.8 0z" fill={p.sun} />
          <g stroke={p.sun} {...LINE}>
            <path d="M3.4 17.4h18.2" />
            <path d="M12 3.8v3.1M7.7 6.3l2 2M16.3 6.3l-2 2" />
          </g>
        </>
      );

    case 'clock':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <circle cx="12" cy="12" r="8.4" />
          <path d="M12 7.4V12l3.2 2" />
        </g>
      );

    case 'calendar':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="3" />
          <path d="M3.6 10h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
        </g>
      );

    case 'wind':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <path d="M3 8.4h9.4a2.9 2.9 0 1 0-2.9-2.9" />
          <path d="M3 13h13.2a2.9 2.9 0 1 1-2.9 2.9" />
          <path d="M3 17.4h6.2" />
        </g>
      );

    case 'humidity':
      return (
        <path
          d="M12 3.2c3.3 4.2 5.6 7 5.6 9.9a5.6 5.6 0 0 1-11.2 0C6.4 10.2 8.7 7.4 12 3.2z"
          fill="currentColor"
        />
      );

    case 'visibility':
      return (
        <>
          <path
            d="M12 5.6c-4.6 0-8.3 3.3-9.6 6.4 1.3 3.1 5 6.4 9.6 6.4s8.3-3.3 9.6-6.4c-1.3-3.1-5-6.4-9.6-6.4z"
            fill="none"
            stroke="currentColor"
            {...LINE}
          />
          <circle cx="12" cy="12" r="3.1" fill="currentColor" />
          <circle cx="12" cy="12" r="1.1" fill="#4E9FE6" />
        </>
      );

    case 'feels-like':
      // 温度计：外管 + 液柱 + 球泡，一眼看懂
      return (
        <>
          <path
            d="M9.9 4.2a2.1 2.1 0 0 1 4.2 0v9.2a4.2 4.2 0 1 1-4.2 0z"
            fill="none"
            stroke="currentColor"
            {...LINE}
          />
          <path d="M12 4.6v9.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="17.4" r="2.6" fill="currentColor" />
        </>
      );

    case 'search':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <circle cx="10.6" cy="10.6" r="6.4" />
          <path d="M15.4 15.4L21 21" />
        </g>
      );

    case 'close':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" />
        </g>
      );

    case 'photo':
      return (
        <g stroke="currentColor" fill="none" {...LINE}>
          <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="3" />
          <circle cx="8.6" cy="10.2" r="1.6" fill="currentColor" stroke="none" />
          <path d="M5.6 17.2l3.9-3.8 2.8 2.7 3.2-3.5 4 4.6" />
        </g>
      );

    case 'star':
      return (
        <path
          d="M12 3.4l2.66 5.39 5.94.86-4.3 4.19 1.02 5.92L12 17.96l-5.32 2.8 1.02-5.92-4.3-4.19 5.94-.86z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      );

    case 'star-filled':
      return (
        <path
          d="M12 3.4l2.66 5.39 5.94.86-4.3 4.19 1.02 5.92L12 17.96l-5.32 2.8 1.02-5.92-4.3-4.19 5.94-.86z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      );

    default:
      return <circle cx="12" cy="12" r="4" fill="currentColor" />;
  }
}
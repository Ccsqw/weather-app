/**
 * 无照片背景时的天气渐变主题。
 * 纯函数，输入当前天气与城市当地时间，输出一个主题名，方便单测。
 */

import type { CurrentWeather, WeatherIcon } from '../types/weather';

export type WeatherTheme =
  | 'day-clear'
  | 'night-clear'
  | 'golden'
  | 'day-cloudy'
  | 'night-cloudy'
  | 'overcast'
  | 'rain'
  | 'thunder'
  | 'snow'
  | 'fog';

export interface WeatherThemeStyle {
  /** 渐变起点（顶部） */
  from: string;
  /** 渐变终点（底部） */
  to: string;
  label: string;
}

/**
 * 配色原则：所有主题的亮端都比纯白深，
 * 保证白色文字（尤其 12-15px 的小字）压得住。
 */
export const WEATHER_THEMES: Record<WeatherTheme, WeatherThemeStyle> = {
  'day-clear': { from: '#4E9FE6', to: '#6FB8F0', label: '晴（白天）' },
  'night-clear': { from: '#0A1730', to: '#1E3A63', label: '晴（夜间）' },
  golden: { from: '#D96A4A', to: '#7A5CA8', label: '日出日落' },
  'day-cloudy': { from: '#4A90CF', to: '#6FA8D8', label: '多云（白天）' },
  'night-cloudy': { from: '#152238', to: '#2C4260', label: '多云（夜间）' },
  overcast: { from: '#5C6B7A', to: '#8C99A6', label: '阴' },
  rain: { from: '#33445A', to: '#5A6E86', label: '雨' },
  thunder: { from: '#242A3E', to: '#4A4F6B', label: '雷阵雨' },
  snow: { from: '#54677D', to: '#93A7BC', label: '雪' },
  fog: { from: '#616C78', to: '#98A3AE', label: '雾' },
};

/** 降水类天气跟昼夜关系不大，直接按天气给 */
const FIXED_BY_ICON: Partial<Record<WeatherIcon, WeatherTheme>> = {
  rain: 'rain',
  snow: 'snow',
  thunder: 'thunder',
  fog: 'fog',
  overcast: 'overcast',
  sunrise: 'golden',
  sunset: 'golden',
};

/** 日出日落前后这段时间按「金色时刻」渲染 */
const GOLDEN_WINDOW_MINUTES = 40;

export function resolveWeatherTheme(current: CurrentWeather, now = new Date()): WeatherTheme {
  const icon = current.icon;

  const fixed = FIXED_BY_ICON[icon];
  if (fixed) return fixed;

  const minutes = cityMinutes(current.obsTime, now);

  if (inGoldenWindow(minutes, current.sunrise, current.sunset)) return 'golden';

  const day = isDaytime(icon, minutes, current.sunrise, current.sunset);
  if (icon === 'sunny' || icon === 'night') return day ? 'day-clear' : 'night-clear';
  return day ? 'day-cloudy' : 'night-cloudy';
}

export function gradientOf(theme: WeatherTheme): string {
  const style = WEATHER_THEMES[theme];
  return `linear-gradient(180deg, ${style.from} 0%, ${style.to} 100%)`;
}

/** 从数据源给的城市当地时间算分钟；拿不到就用浏览器时间兜底 */
function cityMinutes(obsTime: string | undefined, fallback: Date): number | null {
  const matched = /T(\d{2}):(\d{2})/.exec(obsTime ?? '');
  if (matched) return Number(matched[1]) * 60 + Number(matched[2]);

  const hours = fallback.getHours();
  return Number.isFinite(hours) ? hours * 60 + fallback.getMinutes() : null;
}

function parseHhMm(value?: string | null): number | null {
  const matched = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!matched) return null;

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function inGoldenWindow(
  nowMinutes: number | null,
  sunrise?: string | null,
  sunset?: string | null,
): boolean {
  if (nowMinutes === null) return false;

  return [sunrise, sunset].some((value) => {
    const target = parseHhMm(value);
    return target !== null && Math.abs(nowMinutes - target) <= GOLDEN_WINDOW_MINUTES;
  });
}

function isDaytime(
  icon: WeatherIcon,
  nowMinutes: number | null,
  sunrise?: string | null,
  sunset?: string | null,
): boolean {
  if (icon === 'night') return false;

  const rise = parseHhMm(sunrise);
  const set = parseHhMm(sunset);
  if (nowMinutes !== null && rise !== null && set !== null && set > rise) {
    return nowMinutes >= rise && nowMinutes <= set;
  }

  // 没有日出日落数据时用 6:00~18:00 粗略判断，总比一律当白天准
  if (nowMinutes !== null) return nowMinutes >= 6 * 60 && nowMinutes <= 18 * 60;
  return true;
}
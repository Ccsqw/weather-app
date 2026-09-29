/**
 * 和风天气原始结构 -> 本地数据模型。
 * 字段缺失一律返回 null / 默认值，不抛错，由 UI 决定怎么降级展示。
 */

import type { AqiLevel, CurrentWeather, DailyItem, HourlyItem, WeatherIcon } from '../../types/weather';
import { dayLabel, mapAqiAdvice, toNumber } from './shared';

/** /v7/weather/now */
export interface QWeatherNow {
  obsTime?: string;
  temp?: string;
  feelsLike?: string;
  icon?: string;
  text?: string;
  windDir?: string;
  windScale?: string;
  windSpeed?: string;
  humidity?: string;
  dew?: string;
  vis?: string;
  precip?: string;
}

/** /v7/air/now */
export interface QWeatherAirNow {
  pubTime?: string;
  aqi?: string;
  category?: string;
  primary?: string;
}

/** /v7/weather/24h */
export interface QWeatherHourly {
  fxTime?: string;
  temp?: string;
  icon?: string;
  text?: string;
  precip?: string;
}

/** /v7/weather/3d | 7d */
export interface QWeatherDaily {
  fxDate?: string;
  tempMax?: string;
  tempMin?: string;
  iconDay?: string;
  textDay?: string;
  sunrise?: string;
  sunset?: string;
}

const AQI_LEVELS: readonly AqiLevel[] = ['优', '良', '轻度污染', '中度污染', '重度污染', '严重污染'];

export { toNumber };

/** 和风天气 icon code -> 本地图标枚举 */
export function mapIcon(code?: string): WeatherIcon {
  const value = toNumber(code);
  if (value === null) return 'cloudy';

  if (value === 100 || value === 150) return 'sunny';
  if (value === 101 || value === 102 || value === 103) return 'cloudy';
  if (value === 104) return 'overcast';
  if (value === 302 || value === 303) return 'thunder';
  if (value >= 300 && value <= 399) return 'rain';
  if (value >= 400 && value <= 499) return 'snow';
  if (value >= 500 && value <= 515) return 'fog';
  return 'cloudy';
}

/** 优先用数据源给出的等级文案，缺失时按国标 AQI 数值兜底 */
export function mapAqiLevel(category?: string, aqi?: number | null): AqiLevel | null {
  const matched = AQI_LEVELS.find((level) => level === category?.trim());
  if (matched) return matched;
  if (aqi === null || aqi === undefined) return null;

  if (aqi <= 50) return '优';
  if (aqi <= 100) return '良';
  if (aqi <= 150) return '轻度污染';
  if (aqi <= 200) return '中度污染';
  if (aqi <= 300) return '重度污染';
  return '严重污染';
}

export function mapNow(now: QWeatherNow | undefined, air: QWeatherAirNow | null): CurrentWeather {
  const aqi = toNumber(air?.aqi);
  const level = mapAqiLevel(air?.category, aqi);

  return {
    temp: toNumber(now?.temp) ?? 0,
    condition: now?.text?.trim() || '--',
    icon: mapIcon(now?.icon),
    // 当日最高/最低温不在 now 接口里，由 weather.ts 从当日预报合并进来
    tempMax: null,
    tempMin: null,
    aqi,
    aqiLevel: level,
    aqiAdvice: mapAqiAdvice(level),
    humidity: toNumber(now?.humidity),
    dewPoint: toNumber(now?.dew),
    feelsLike: toNumber(now?.feelsLike),
    windScale: toNumber(now?.windScale),
    windDir: now?.windDir?.trim() || null,
    // 和风天气的 windSpeed 单位就是 km/h
    windSpeed: toNumber(now?.windSpeed),
    // 紫外线指数需要 indices 接口，暂未接入
    uvIndex: null,
    visibility: toNumber(now?.vis),
    sunrise: null,
    sunset: null,
    obsTime: now?.obsTime ?? new Date().toISOString(),
  };
}

/** 从 ISO 串里直接读「当地小时」，避免被浏览器时区带偏 */
export function hourFromIso(iso?: string): number | null {
  const matched = /T(\d{2})/.exec(iso ?? '');
  return matched ? Number(matched[1]) : null;
}

export function mapHourly(item: QWeatherHourly, index: number, firstItem?: QWeatherHourly): HourlyItem {
  const baseHour = hourFromIso(firstItem?.fxTime);
  const ownHour = hourFromIso(item.fxTime);
  const hour = ownHour ?? (baseHour === null ? null : (baseHour + index) % 24);

  return {
    time: item.fxTime ?? '',
    label: index === 0 ? '现在' : hour === null ? '--' : `${hour}时`,
    temp: toNumber(item.temp) ?? 0,
    icon: mapIcon(item.icon),
    precip: toNumber(item.precip),
    // 和风天气 24h 接口不提供降水概率
    pop: null,
  };
}

export function mapDaily(item: QWeatherDaily, index: number): DailyItem {
  return {
    day: dayLabel(index, weekdayOf(item.fxDate)),
    date: item.fxDate ?? '',
    icon: mapIcon(item.iconDay),
    tempMin: toNumber(item.tempMin) ?? 0,
    tempMax: toNumber(item.tempMax) ?? 0,
    sunrise: item.sunrise?.trim() || null,
    sunset: item.sunset?.trim() || null,
  };
}

function weekdayOf(value?: string): number | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!matched) return null;
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])).getDay();
}
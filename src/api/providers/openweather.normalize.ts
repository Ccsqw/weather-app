/**
 * OpenWeatherMap One Call -> 本地数据模型。
 *
 * 说明：One Call 3.0 / 4.0 的字段基本一致，daily 的温度有
 * { temp: { min, max } } 与拍平的 temp_min / temp_max 两种写法，这里都兼容。
 */

import type { AqiLevel, CurrentWeather, DailyItem, HourlyItem, WeatherIcon } from '../../types/weather';
import { dayLabel, daysBetween, mapAqiAdvice, OWM_AQI_LEVELS, relativeDayLabel, round1, toNumber } from './shared';
import type { ProviderWeather } from './types';

export interface OwmCondition {
  id?: number;
  main?: string;
  description?: string;
  icon?: string;
}

export interface OwmCurrent {
  dt?: number;
  sunrise?: number;
  sunset?: number;
  temp?: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  uvi?: number;
  clouds?: number;
  /** 米 */
  visibility?: number;
  /** 米/秒（units=metric） */
  wind_speed?: number;
  wind_deg?: number;
  wind_gust?: number;
  weather?: OwmCondition[];
}

export interface OwmPrecipitation {
  '1h'?: number;
}

export interface OwmHourly extends OwmCurrent {
  /** 降水概率 0~1 */
  pop?: number;
  rain?: OwmPrecipitation;
  snow?: OwmPrecipitation;
}

export interface OwmDailyTemp {
  min?: number;
  max?: number;
  day?: number;
  night?: number;
  eve?: number;
  morn?: number;
}

export interface OwmDaily {
  dt?: number;
  sunrise?: number;
  sunset?: number;
  temp?: OwmDailyTemp;
  temp_min?: number;
  temp_max?: number;
  humidity?: number;
  dew_point?: number;
  wind_speed?: number;
  wind_deg?: number;
  pop?: number;
  uvi?: number;
  clouds?: number;
  weather?: OwmCondition[];
}

export interface OwmOneCall {
  lat?: number;
  lon?: number;
  timezone?: string;
  timezone_offset?: number;
  current?: OwmCurrent;
  hourly?: OwmHourly[];
  daily?: OwmDaily[];
}

export interface OwmAirItem {
  dt?: number;
  main?: { aqi?: number };
  components?: Record<string, number>;
}

export interface OwmAirPollution {
  list?: OwmAirItem[];
}

/** /geo/1.0/direct 返回的数组元素 */
export interface OwmGeoItem {
  name?: string;
  local_names?: Record<string, string>;
  lat?: number;
  lon?: number;
  country?: string;
  state?: string;
}

/** OWM 图标编号 -> 本地图标枚举（01n 这类夜间码走月亮图标） */
export function mapOwmIcon(icon?: string): WeatherIcon {
  const code = icon?.slice(0, 2);
  const isNight = icon?.endsWith('n') ?? false;

  switch (code) {
    case '01':
      return isNight ? 'night' : 'sunny';
    case '02':
    case '03':
      return 'cloudy';
    case '04':
      return 'overcast';
    case '09':
    case '10':
      return 'rain';
    case '11':
      return 'thunder';
    case '13':
      return 'snow';
    case '50':
      return 'fog';
    default:
      return 'cloudy';
  }
}

/** 米/秒 -> 蒲福风级 */
export function beaufortFromMs(speed?: number | null): number | null {
  if (speed === null || speed === undefined || !Number.isFinite(speed)) return null;

  const thresholds = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  for (let level = 0; level < thresholds.length; level += 1) {
    if (speed < thresholds[level]) return level;
  }
  return 12;
}

const WIND_DIRECTIONS = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];

/** 米/秒 -> km/h（OWM 在 units=metric 下给的是米/秒） */
export function windSpeedKmhFromMs(speed?: number | null): number | null {
  if (speed === null || speed === undefined || !Number.isFinite(speed)) return null;
  return Math.round(speed * 3.6 * 10) / 10;
}

/** 风向角度 -> 中文风向（8 方位，每 45 度一档） */
export function windDirFromDeg(deg?: number | null): string | null {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) return null;

  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return WIND_DIRECTIONS[index];
}

/**
 * One Call 的时间戳是 UTC 秒，配合 timezone_offset（城市相对 UTC 的秒数）
 * 才能算出「城市本地时间」，所以统一用 getUTC* 读取偏移后的时间。
 */
function cityDate(unix?: number, offsetSeconds = 0): Date | null {
  if (unix === undefined || unix === null || !Number.isFinite(unix)) return null;
  return new Date((unix + offsetSeconds) * 1000);
}

export function cityHour(unix?: number, offsetSeconds = 0): number | null {
  const date = cityDate(unix, offsetSeconds);
  return date ? date.getUTCHours() : null;
}

export function formatCityTime(unix?: number, offsetSeconds = 0): string | null {
  const date = cityDate(unix, offsetSeconds);
  if (!date) return null;

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function cityDateString(unix?: number, offsetSeconds = 0): string {
  const date = cityDate(unix, offsetSeconds);
  return date ? date.toISOString().slice(0, 10) : '';
}

function cityWeekday(unix?: number, offsetSeconds = 0): number | null {
  const date = cityDate(unix, offsetSeconds);
  return date ? date.getUTCDay() : null;
}

export function mapOwmCurrent(
  current: OwmCurrent | undefined,
  offsetSeconds: number,
  air: OwmAirItem | null,
): CurrentWeather {
  const condition = current?.weather?.[0];
  // OWM 的空气质量接口给的是 1~5 等级索引，不是国标 AQI 数值
  const aqiIndex = toNumber(air?.main?.aqi);
  const level: AqiLevel | null = aqiIndex === null ? null : OWM_AQI_LEVELS[aqiIndex] ?? null;

  return {
    temp: round1(current?.temp) ?? 0,
    condition: condition?.description?.trim() || '--',
    icon: mapOwmIcon(condition?.icon),
    tempMax: null,
    tempMin: null,
    aqi: aqiIndex,
    aqiLevel: level,
    aqiAdvice: mapAqiAdvice(level),
    humidity: toNumber(current?.humidity),
    dewPoint: round1(current?.dew_point),
    feelsLike: round1(current?.feels_like),
    windScale: beaufortFromMs(current?.wind_speed),
    windDir: windDirFromDeg(current?.wind_deg),
    windSpeed: windSpeedKmhFromMs(current?.wind_speed),
    uvIndex: round1(current?.uvi),
    visibility:
      current?.visibility === undefined || current.visibility === null
        ? null
        : Math.round(current.visibility / 1000),
    sunrise: formatCityTime(current?.sunrise, offsetSeconds),
    sunset: formatCityTime(current?.sunset, offsetSeconds),
    obsTime: current?.dt ? new Date(current.dt * 1000).toISOString() : new Date().toISOString(),
  };
}

export function mapOwmHourly(item: OwmHourly, index: number, offsetSeconds: number): HourlyItem {
  const hour = cityHour(item.dt, offsetSeconds);

  return {
    time: item.dt ? new Date(item.dt * 1000).toISOString() : '',
    label: index === 0 ? '现在' : hour === null ? '--' : `${hour}时`,
    temp: round1(item.temp) ?? 0,
    icon: mapOwmIcon(item.weather?.[0]?.icon),
    precip: round1(item.rain?.['1h'] ?? item.snow?.['1h'] ?? null),
    pop: toNumber(item.pop),
  };
}

export function mapOwmDaily(item: OwmDaily, index: number, offsetSeconds: number): DailyItem {
  const temp = item.temp ?? {};
  const min = temp.min ?? item.temp_min ?? null;
  const max = temp.max ?? item.temp_max ?? null;

  return {
    day: dayLabel(index, cityWeekday(item.dt, offsetSeconds)),
    date: cityDateString(item.dt, offsetSeconds),
    icon: mapOwmIcon(item.weather?.[0]?.icon),
    tempMin: round1(min) ?? 0,
    tempMax: round1(max) ?? 0,
    sunrise: formatCityTime(item.sunrise, offsetSeconds),
    sunset: formatCityTime(item.sunset, offsetSeconds),
  };
}

/** One Call 响应 + 可选的空气质量响应 -> 本地模型 */
export function mapOneCall(payload: OwmOneCall, air: OwmAirItem | null, days: number): ProviderWeather {
  const offsetSeconds = payload.timezone_offset ?? 0;

  return {
    current: mapOwmCurrent(payload.current, offsetSeconds, air),
    // One Call 最多给 48 小时，UI 展示 24 条足够
    hourly: (payload.hourly ?? []).slice(0, 24).map((item, index) => mapOwmHourly(item, index, offsetSeconds)),
    daily: (payload.daily ?? []).slice(0, days).map((item, index) => mapOwmDaily(item, index, offsetSeconds)),
  };
}
/* ==================== 免费版 2.5 接口 ==================== */
/**
 * 免费 Key 用不了 One Call，只能走 /data/2.5/weather + /data/2.5/forecast。
 * 差异：
 * - 预报是 3 小时粒度、只覆盖 5 天
 * - 没有逐天聚合，日最高最低温要自己按城市时区归并
 * - 没有露点（用 Magnus 公式算）和紫外线（只能给 null）
 */

export interface OwmFreeCurrent {
  dt?: number;
  /** 城市相对 UTC 的秒数偏移 */
  timezone?: number;
  name?: string;
  main?: {
    temp?: number;
    feels_like?: number;
    temp_min?: number;
    temp_max?: number;
    humidity?: number;
    pressure?: number;
  };
  weather?: OwmCondition[];
  wind?: { speed?: number; deg?: number; gust?: number };
  clouds?: { all?: number };
  /** 米 */
  visibility?: number;
  rain?: OwmPrecipitation;
  snow?: OwmPrecipitation;
  sys?: { sunrise?: number; sunset?: number; country?: string; pod?: string };
}

export interface OwmFreeForecastItem {
  dt?: number;
  main?: { temp?: number; feels_like?: number; temp_min?: number; temp_max?: number; humidity?: number };
  weather?: OwmCondition[];
  wind?: { speed?: number; deg?: number };
  visibility?: number;
  /** 降水概率 0~1 */
  pop?: number;
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
  sys?: { pod?: string };
}

export interface OwmFreeForecast {
  city?: { name?: string; timezone?: number; sunrise?: number; sunset?: number; country?: string };
  list?: OwmFreeForecastItem[];
}

/** Magnus 公式：由气温和相对湿度反推露点 */
export function dewPointFrom(tempC: number | null, humidity: number | null): number | null {
  if (tempC === null || humidity === null || humidity <= 0 || humidity > 100) return null;

  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);

  return Number.isFinite(dewPoint) ? Math.round(dewPoint * 10) / 10 : null;
}

export function mapFreeCurrent(
  current: OwmFreeCurrent | undefined,
  offsetSeconds: number,
  air: OwmAirItem | null,
): CurrentWeather {
  const condition = current?.weather?.[0];
  const temp = round1(current?.main?.temp);
  const humidity = toNumber(current?.main?.humidity);
  const aqiIndex = toNumber(air?.main?.aqi);
  const level: AqiLevel | null = aqiIndex === null ? null : OWM_AQI_LEVELS[aqiIndex] ?? null;

  return {
    temp: temp ?? 0,
    condition: condition?.description?.trim() || '--',
    icon: mapOwmIcon(condition?.icon),
    // 2.5 的 temp_min/max 是当天范围，作为兜底；daily 聚合结果会覆盖它
    tempMax: round1(current?.main?.temp_max),
    tempMin: round1(current?.main?.temp_min),
    aqi: aqiIndex,
    aqiLevel: level,
    aqiAdvice: mapAqiAdvice(level),
    humidity,
    dewPoint: dewPointFrom(temp, humidity),
    feelsLike: round1(current?.main?.feels_like),
    windScale: beaufortFromMs(current?.wind?.speed),
    windDir: windDirFromDeg(current?.wind?.deg),
    windSpeed: windSpeedKmhFromMs(current?.wind?.speed),
    // 紫外线只有 One Call 才提供
    uvIndex: null,
    visibility:
      current?.visibility === undefined || current.visibility === null
        ? null
        : Math.round(current.visibility / 1000),
    sunrise: formatCityTime(current?.sys?.sunrise, offsetSeconds),
    sunset: formatCityTime(current?.sys?.sunset, offsetSeconds),
    obsTime: current?.dt ? new Date(current.dt * 1000).toISOString() : new Date().toISOString(),
  };
}

export function mapFreeHourly(item: OwmFreeForecastItem, index: number, offsetSeconds: number): HourlyItem {
  const hour = cityHour(item.dt, offsetSeconds);

  return {
    time: item.dt ? new Date(item.dt * 1000).toISOString() : '',
    label: index === 0 ? '现在' : hour === null ? '--' : `${hour}时`,
    temp: round1(item.main?.temp) ?? 0,
    icon: mapOwmIcon(item.weather?.[0]?.icon),
    // 2.5 给的是 3 小时累计降水量
    precip: round1(item.rain?.['3h'] ?? item.snow?.['3h'] ?? null),
    pop: toNumber(item.pop),
  };
}

/**
 * 2.5 的预报是 3 小时粒度且从下一个整点开始，
 * 这里用实时天气补一条「现在」，让首列和设计稿一致。
 */
export function buildFreeHourly(
  current: CurrentWeather,
  list: OwmFreeForecastItem[],
  offsetSeconds: number,
): HourlyItem[] {
  const forecastItems = list.slice(0, 23).map((item, index) => mapFreeHourly(item, index + 1, offsetSeconds));

  return [
    { time: current.obsTime, label: '现在', temp: current.temp, icon: current.icon, precip: null, pop: null },
    ...forecastItems,
  ];
}

/**
 * 把 3 小时粒度的预报按城市本地日期归并成逐天数据。
 * 接口给的是 120 小时（5 天）窗口，按自然日切必然跨 6 天，首尾两天是半天。
 */
export function buildFreeDaily(
  forecast: OwmFreeForecast,
  offsetSeconds: number,
  days: number,
  currentDt?: number,
): DailyItem[] {
  const buckets = new Map<string, OwmFreeForecastItem[]>();

  for (const item of forecast.list ?? []) {
    const date = cityDateString(item.dt, offsetSeconds);
    if (!date) continue;

    const bucket = buckets.get(date);
    if (bucket) bucket.push(item);
    else buckets.set(date, [item]);
  }

  const entries = [...buckets.entries()];

  // 末尾不满 3 条（不到 9 小时）的是残段，不是有效的一天；首个半天代表「今天」，保留
  if (entries.length > 1 && entries[entries.length - 1][1].length < 3) {
    entries.pop();
  }

  const todayDate = currentDt === undefined ? null : cityDateString(currentDt, offsetSeconds);
  const daily: DailyItem[] = [];

  for (const [date, bucket] of entries) {
    if (daily.length >= days) break;

    const temps = bucket
      .map((item) => toNumber(item.main?.temp))
      .filter((value): value is number => value !== null);
    if (temps.length === 0) continue;

    const noon = pickClosestToNoon(bucket, offsetSeconds);

    daily.push({
      // 标签按真实日期算，避免首段不是今天时错标成「今天」
      day: relativeDayLabel(daysBetween(todayDate, date), weekdayOfDate(date)),
      date,
      // 用最接近正午的那条代表全天天气
      icon: mapOwmIcon(noon?.weather?.[0]?.icon),
      tempMin: Math.round(Math.min(...temps) * 10) / 10,
      tempMax: Math.round(Math.max(...temps) * 10) / 10,
      sunrise: null,
      sunset: null,
    });
  }

  // 2.5 只提供当天的日出日落
  if (daily[0]) {
    daily[0] = {
      ...daily[0],
      sunrise: formatCityTime(forecast.city?.sunrise, offsetSeconds),
      sunset: formatCityTime(forecast.city?.sunset, offsetSeconds),
    };
  }

  return daily;
}

function pickClosestToNoon(
  items: OwmFreeForecastItem[],
  offsetSeconds: number,
): OwmFreeForecastItem | undefined {
  let best: OwmFreeForecastItem | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const hour = cityHour(item.dt, offsetSeconds);
    if (hour === null) continue;

    const distance = Math.abs(hour - 12);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }

  return best ?? items[0];
}

function weekdayOfDate(date: string): number | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!matched) return null;
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])).getDay();
}
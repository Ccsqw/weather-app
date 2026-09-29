/**
 * 业务接口层，对外三个函数：
 * - getCurrentWeather() 实时天气（含空气质量）
 * - getForecast()       未来预报（逐小时 + 逐天）
 * - getWeather()        合并结果，直接对应 WeatherData，给页面用
 *
 * 三者都支持「城市名」或「经纬度」查询，具体走哪个数据源由
 * VITE_WEATHER_PROVIDER 决定（qweather / openweathermap），这里不做任何数据源判断。
 */

import { MOCK_LATENCY_MS, USE_MOCK } from './config';
import { byCity, byCoords, type LocationQuery, type ResolvedLocation } from './location';
import { MOCK_WEATHER } from './mock';
import { getProvider } from './providers';
import type { CitySuggestion, CurrentWeather, DailyItem, HourlyItem, RainInfo, WeatherData } from '../types/weather';

export interface RequestOptions {
  /** 预报天数：3 或 7（和风天气 7d、OWM One Call 8 天取前 N 条） */
  days?: 3 | 7;
  signal?: AbortSignal;
}

export interface CurrentWeatherResult {
  location: ResolvedLocation;
  current: CurrentWeather;
}

export interface ForecastResult {
  location: ResolvedLocation;
  hourly: HourlyItem[];
  daily: DailyItem[];
}

interface LoadedWeather {
  location: ResolvedLocation;
  current: CurrentWeather;
  hourly: HourlyItem[];
  daily: DailyItem[];
  rain: RainInfo;
}

/** 实时天气：只返回 current */
export async function getCurrentWeather(
  query: LocationQuery,
  options: RequestOptions = {},
): Promise<CurrentWeatherResult> {
  const { location, current } = await loadWeather(query, options);
  return { location, current };
}

/** 未来预报：只返回逐小时 + 逐天 */
export async function getForecast(
  query: LocationQuery,
  options: RequestOptions = {},
): Promise<ForecastResult> {
  const { location, hourly, daily } = await loadWeather(query, options);
  return { location, hourly, daily };
}

/** 合并版：页面直接消费这个，一次拿到整屏所需数据 */
export async function getWeather(
  query: LocationQuery,
  options: RequestOptions = {},
): Promise<WeatherData> {
  const result = await loadWeather(query, options);

  return {
    location: { city: result.location.name, cityId: result.location.id },
    current: result.current,
    rain: result.rain,
    hourly: result.hourly,
    daily: result.daily,
  };
}

/**
 * 城市名联想。
 * mock 模式只用本地城市库；接口失败时静默返回空数组，不影响手输搜索。
 */
export async function searchCities(keyword: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  const trimmed = keyword.trim();
  if (trimmed === '' || USE_MOCK) return [];

  try {
    return await getProvider().searchCities(trimmed, signal);
  } catch {
    return [];
  }
}

/**
 * 只解析地点（含经纬度），给背景图这类需要坐标的场景用。
 * 复用 provider 的地点缓存，城市名不会重复查。
 */
export async function resolveCityLocation(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<ResolvedLocation> {
  if (USE_MOCK) return mockLocation(query);
  return getProvider().resolveLocation(query, signal);
}

/** 便捷入口：按城市名查询 */
export function getWeatherByCity(city: string, adm?: string, options?: RequestOptions): Promise<WeatherData> {
  return getWeather(byCity(city, adm), options);
}

/** 便捷入口：按经纬度查询 */
export function getWeatherByCoords(lat: number, lon: number, options?: RequestOptions): Promise<WeatherData> {
  return getWeather(byCoords(lat, lon), options);
}

/** 依据未来 2 小时的降水量与降水概率生成提示 */
export function buildRainInfo(hourly: HourlyItem[]): RainInfo {
  const nextTwoHours = hourly.slice(0, 2);
  if (nextTwoHours.length === 0) {
    return { summary: '暂无降水数据。', hasRain: false };
  }

  // 有的数据源只给降水概率，有的只给天气图标，三者任一成立就算有降水
  const isWet = (item: HourlyItem) =>
    (item.precip ?? 0) > 0 ||
    (item.pop ?? 0) >= 0.4 ||
    item.icon === 'rain' ||
    item.icon === 'snow' ||
    item.icon === 'thunder';

  const wetIndex = nextTwoHours.findIndex(isWet);
  if (wetIndex === -1) {
    return { summary: '未来 2 小时内无降水。', hasRain: false };
  }
  if (wetIndex === 0) {
    return { summary: '当前正在降水，外出记得带伞。', hasRain: true };
  }
  return { summary: '未来 1 小时内可能开始降水，外出记得带伞。', hasRain: true };
}

/** 统一入口：mock / 真实数据源都从这里出 */
async function loadWeather(query: LocationQuery, options: RequestOptions): Promise<LoadedWeather> {
  const days = options.days ?? 7;

  if (USE_MOCK) {
    await sleep(MOCK_LATENCY_MS);
    return {
      location: mockLocation(query),
      current: MOCK_WEATHER.current,
      hourly: MOCK_WEATHER.hourly,
      daily: MOCK_WEATHER.daily.slice(0, days),
      rain: buildRainInfo(MOCK_WEATHER.hourly),
    };
  }

  const provider = getProvider();
  const location = await provider.resolveLocation(query, options.signal);
  const { current, hourly, daily } = await provider.fetchWeather(location, { days, signal: options.signal });

  const today = daily[0];

  return {
    location,
    current: {
      ...current,
      // 当日最高最低温、日出日落只有逐天预报里才有，这里补进 current
      tempMax: today?.tempMax ?? current.tempMax,
      tempMin: today?.tempMin ?? current.tempMin,
      sunrise: current.sunrise ?? today?.sunrise ?? null,
      sunset: current.sunset ?? today?.sunset ?? null,
    },
    hourly,
    daily,
    rain: buildRainInfo(hourly),
  };
}

/** mock 模式下不请求接口，直接按入参伪造一个地点 */
function mockLocation(query: LocationQuery): ResolvedLocation {
  if (query.kind === 'coords') {
    return {
      id: `${query.lon.toFixed(2)},${query.lat.toFixed(2)}`,
      name: '当前位置',
      lat: query.lat,
      lon: query.lon,
      source: 'coords',
    };
  }

  return {
    id: MOCK_WEATHER.location.cityId,
    name: query.city || MOCK_WEATHER.location.city,
    // mock 模式没有地理编码，固定用上海坐标，方便离线看背景图效果
    lat: 31.2304,
    lon: 121.4737,
    source: 'lookup',
  };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
import { requestJson, type AuthConfig } from '../client';
import {
  OPENWEATHER_API_BASE_URL,
  OPENWEATHER_API_KEY,
  OPENWEATHER_API_MODE,
  OPENWEATHER_LANG,
  OPENWEATHER_UNITS,
} from '../config';
import { ApiError } from '../error';
import { fromCoordsQuery, resolveWithCache, type LocationQuery, type ResolvedLocation } from '../location';
import {
  buildFreeDaily,
  buildFreeHourly,
  mapFreeCurrent,
  mapOneCall,
  type OwmAirPollution,
  type OwmFreeCurrent,
  type OwmFreeForecast,
  type OwmGeoItem,
  type OwmOneCall,
} from './openweather.normalize';
import type { CitySuggestion } from '../../types/weather';
import type { ProviderWeather, WeatherProvider } from './types';

const AUTH: AuthConfig = {
  // OWM 统一用 appid query 参数鉴权
  paramName: 'appid',
  key: OPENWEATHER_API_KEY,
  providerLabel: 'OpenWeatherMap',
  envVar: 'VITE_OPENWEATHER_API_KEY',
};

/** One Call 路径，换成 /data/3.0/onecall 即可切到 3.0 */
const ONECALL_PATH = '/data/4.0/onecall';
/** 免费 Key 可用的接口 */
const FREE_CURRENT_PATH = '/data/2.5/weather';
const FREE_FORECAST_PATH = '/data/2.5/forecast';
const AIR_POLLUTION_PATH = '/data/2.5/air_pollution';
const GEO_PATH = '/geo/1.0/direct';

type ActiveMode = 'onecall' | 'free';

/**
 * auto 模式下先按 One Call 走，撞到 401/403 再永久降级到免费接口，
 * 降级结果记在模块变量里，同一会话内不会重复撞墙。
 */
let activeMode: ActiveMode = OPENWEATHER_API_MODE === 'free' ? 'free' : 'onecall';

export function getOpenWeatherMode(): ActiveMode | 'auto' {
  return OPENWEATHER_API_MODE === 'auto' ? (activeMode === 'free' ? 'free' : 'onecall') : OPENWEATHER_API_MODE;
}

export const openWeatherProvider: WeatherProvider = {
  id: 'openweathermap',
  label: 'OpenWeatherMap',

  resolveLocation(query, signal) {
    return resolveWithCache('openweathermap', query, async (target) => {
      if (target.kind === 'coords') return fromCoordsQuery(target);
      return lookupCity(target, signal);
    });
  },

  async fetchWeather(location, { days, signal }) {
    const { lat, lon } = location;
    if (lat === undefined || lon === undefined) {
      throw new ApiError('CONFIG', 'OpenWeatherMap 需要经纬度，请用 byCity() 查城市或 byCoords() 传坐标');
    }

    if (activeMode === 'free') return loadFree({ lat, lon }, days, signal);

    try {
      return await loadOneCall({ lat, lon }, days, signal);
    } catch (error) {
      if (OPENWEATHER_API_MODE !== 'auto' || !isSubscriptionError(error)) throw error;

      activeMode = 'free';
      console.warn(
        '[配置] One Call 接口不可用（当前 Key 未订阅 One Call），已自动切换到免费版 2.5 接口：' +
          '预报为 3 小时粒度、最多 5 天，紫外线不可用。' +
          '想固定该行为可在 .env.local 设置 VITE_OPENWEATHER_API_MODE=free。',
      );
      return loadFree({ lat, lon }, days, signal);
    }
  },

  /** 城市名联想：Geocoding API 的 q 参数 */
  async searchCities(keyword: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
    const trimmed = keyword.trim();
    if (!trimmed) return [];

    const matches = await requestJson<OwmGeoItem[]>(GEO_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: { q: trimmed, limit: 8 },
      signal,
    });

    if (!Array.isArray(matches)) return [];

    return matches
      .map((item) => ({
        name: item.local_names?.zh?.trim() || item.name?.trim() || '',
        adm: [item.state, item.country].filter(Boolean).join(' ') || undefined,
        source: 'remote' as const,
      }))
      .filter((item) => item.name !== '');
  },
};

interface Coords {
  lat: number;
  lon: number;
}

/** One Call 4.0：一次拿到 current / hourly / daily */
async function loadOneCall(coords: Coords, days: 3 | 7, signal?: AbortSignal): Promise<ProviderWeather> {
  const [oneCall, airPollution] = await Promise.all([
    requestJson<OwmOneCall>(ONECALL_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: {
        lat: coords.lat,
        lon: coords.lon,
        units: OPENWEATHER_UNITS,
        lang: OPENWEATHER_LANG,
        exclude: 'minutely,alerts',
      },
      signal,
    }),
    requestJson<OwmAirPollution>(AIR_POLLUTION_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: { lat: coords.lat, lon: coords.lon },
      signal,
    }).catch(() => null),
  ]);

  return mapOneCall(oneCall, airPollution?.list?.[0] ?? null, days);
}

/** 免费版 2.5：/weather + /forecast，逐天数据由 3 小时粒度归并得到 */
async function loadFree(coords: Coords, days: 3 | 7, signal?: AbortSignal): Promise<ProviderWeather> {
  const [currentRaw, forecastRaw, airPollution] = await Promise.all([
    requestJson<OwmFreeCurrent>(FREE_CURRENT_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: {
        lat: coords.lat,
        lon: coords.lon,
        units: OPENWEATHER_UNITS,
        lang: OPENWEATHER_LANG,
      },
      signal,
    }),
    requestJson<OwmFreeForecast>(FREE_FORECAST_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: {
        lat: coords.lat,
        lon: coords.lon,
        units: OPENWEATHER_UNITS,
        lang: OPENWEATHER_LANG,
      },
      signal,
    }),
    requestJson<OwmAirPollution>(AIR_POLLUTION_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: { lat: coords.lat, lon: coords.lon },
      signal,
    }).catch(() => null),
  ]);

  const offsetSeconds = currentRaw.timezone ?? forecastRaw.city?.timezone ?? 0;
  const current = mapFreeCurrent(currentRaw, offsetSeconds, airPollution?.list?.[0] ?? null);

  return {
    current,
    hourly: buildFreeHourly(current, forecastRaw.list ?? [], offsetSeconds),
    daily: buildFreeDaily(forecastRaw, offsetSeconds, days, currentRaw.dt),
  };
}

/** 401 / 403 都视为「没订阅 One Call」 */
function isSubscriptionError(error: unknown): boolean {
  if (!ApiError.is(error)) return false;

  const code = error.providerCode ?? '';
  return error.status === 401 || error.status === 403 || code === '401' || code === '403';
}

/** 城市名 -> 经纬度（走 Geocoding API） */
async function lookupCity(
  query: Extract<LocationQuery, { kind: 'city' }>,
  signal?: AbortSignal,
): Promise<ResolvedLocation> {
  if (!query.city) {
    throw new ApiError('CONFIG', '城市名称不能为空');
  }

  // OWM 的地理编码只认英文/当地语言城市名，带上级行政区可能匹配不到，
  // 所以先试「城市,行政区」，没结果再退回只用城市名
  const candidates = query.adm ? [`${query.city},${query.adm}`, query.city] : [query.city];

  for (const candidate of candidates) {
    const matches = await requestJson<OwmGeoItem[]>(GEO_PATH, {
      baseUrl: OPENWEATHER_API_BASE_URL,
      auth: AUTH,
      params: { q: candidate, limit: 1 },
      signal,
    });

    const first = matches?.[0];
    if (first?.lat !== undefined && first?.lon !== undefined) {
      return {
        id: `${first.lat},${first.lon}`,
        // 有中文别名时优先用中文
        name: first.local_names?.zh?.trim() || first.name?.trim() || query.city,
        adm1: first.state,
        country: first.country,
        lat: first.lat,
        lon: first.lon,
        source: 'lookup',
      };
    }
  }

  throw new ApiError('NOT_FOUND', `找不到该城市：「${query.city}」，请检查名称是否正确`);
}
import { requestJson, type AuthConfig } from '../client';
import { QWEATHER_API_BASE_URL, QWEATHER_API_KEY, QWEATHER_GEO_BASE_URL } from '../config';
import { ApiError } from '../error';
import { fromCoordsQuery, resolveWithCache, type LocationQuery, type ResolvedLocation } from '../location';
import {
  mapDaily,
  mapHourly,
  mapNow,
  type QWeatherAirNow,
  type QWeatherDaily,
  type QWeatherHourly,
  type QWeatherNow,
} from './qweather.normalize';
import type { CitySuggestion } from '../../types/weather';
import type { WeatherProvider } from './types';

const AUTH: AuthConfig = {
  // 旧版控制台用 key 参数，新版用 Header，两个都带上
  paramName: 'key',
  headerName: 'X-QW-Api-Key',
  key: QWEATHER_API_KEY,
  providerLabel: '和风天气',
  envVar: 'VITE_WEATHER_API_KEY',
};

const COMMON_PARAMS = { lang: 'zh', unit: 'm' } as const;

interface NowResponse { now?: QWeatherNow }
interface AirResponse { now?: QWeatherAirNow }
interface HourlyResponse { hourly?: QWeatherHourly[] }
interface DailyResponse { daily?: QWeatherDaily[] }

interface GeoItem {
  id?: string;
  name?: string;
  adm1?: string;
  adm2?: string;
  country?: string;
  lat?: string;
  lon?: string;
}

interface GeoLookupResponse {
  location?: GeoItem[];
}

export const qweatherProvider: WeatherProvider = {
  id: 'qweather',
  label: '和风天气',

  resolveLocation(query, signal) {
    return resolveWithCache('qweather', query, async (target) => {
      if (target.kind === 'coords') return fromCoordsQuery(target);
      return lookupCity(target, signal);
    });
  },

  async fetchWeather(location, { days, signal }) {
    const [nowResponse, airResponse, hourlyResponse, dailyResponse] = await Promise.all([
      requestJson<NowResponse>('/v7/weather/now', {
        baseUrl: QWEATHER_API_BASE_URL,
        auth: AUTH,
        params: { ...COMMON_PARAMS, location: location.id },
        signal,
      }),
      // 空气质量属于可选增强：未订阅该接口时不应影响实时天气展示
      requestJson<AirResponse>('/v7/air/now', {
        baseUrl: QWEATHER_API_BASE_URL,
        auth: AUTH,
        params: { ...COMMON_PARAMS, location: location.id },
        signal,
      }).catch(() => null),
      requestJson<HourlyResponse>('/v7/weather/24h', {
        baseUrl: QWEATHER_API_BASE_URL,
        auth: AUTH,
        params: { ...COMMON_PARAMS, location: location.id },
        signal,
      }),
      requestJson<DailyResponse>(days === 7 ? '/v7/weather/7d' : '/v7/weather/3d', {
        baseUrl: QWEATHER_API_BASE_URL,
        auth: AUTH,
        params: { ...COMMON_PARAMS, location: location.id },
        signal,
      }),
    ]);

    const rawHourly = hourlyResponse.hourly ?? [];

    return {
      current: mapNow(nowResponse.now, airResponse?.now ?? null),
      hourly: rawHourly.map((item, index) => mapHourly(item, index, rawHourly[0])),
      daily: (dailyResponse.daily ?? []).slice(0, days).map(mapDaily),
    };
  },

  /** 城市名联想：GeoAPI 本身就支持模糊查询 */
  async searchCities(keyword: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
    const trimmed = keyword.trim();
    if (!trimmed) return [];

    const response = await requestJson<GeoLookupResponse>('/v2/city/lookup', {
      baseUrl: QWEATHER_GEO_BASE_URL,
      auth: AUTH,
      params: { location: trimmed, number: 8, lang: 'zh' },
      signal,
    });

    return (response.location ?? [])
      .map((item) => ({ name: item.name ?? '', adm: item.adm1, source: 'remote' as const }))
      .filter((item) => item.name !== '');
  },
};

/** 城市名 -> LocationID（走 GeoAPI） */
async function lookupCity(
  query: Extract<LocationQuery, { kind: 'city' }>,
  signal?: AbortSignal,
): Promise<ResolvedLocation> {
  if (!query.city) {
    throw new ApiError('CONFIG', '城市名称不能为空');
  }

  const response = await requestJson<GeoLookupResponse>('/v2/city/lookup', {
    baseUrl: QWEATHER_GEO_BASE_URL,
    auth: AUTH,
    params: {
      location: [query.adm, query.city].filter(Boolean).join(' '),
      number: 1,
      lang: 'zh',
    },
    signal,
  });

  const match = response.location?.[0];
  if (!match?.id) {
    throw new ApiError('NOT_FOUND', `找不到该城市：「${query.city}」，请检查名称是否正确`);
  }

  return {
    id: match.id,
    name: match.name ?? query.city,
    adm1: match.adm1,
    adm2: match.adm2,
    country: match.country,
    lat: toNumber(match.lat),
    lon: toNumber(match.lon),
    source: 'lookup',
  };
}

function toNumber(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
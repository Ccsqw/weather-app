import type { ProviderId } from '../config';
import type { LocationQuery, ResolvedLocation } from '../location';
import type { CitySuggestion, CurrentWeather, DailyItem, HourlyItem } from '../../types/weather';

export interface ProviderWeather {
  current: CurrentWeather;
  hourly: HourlyItem[];
  daily: DailyItem[];
}

export interface FetchOptions {
  days: 3 | 7;
  signal?: AbortSignal;
}

/**
 * 一个数据源需要实现的两件事：
 * 1. 把 LocationQuery 解析成自己需要的地点参数
 * 2. 拉取一屏所需的全部天气数据
 */
export interface WeatherProvider {
  id: ProviderId;
  label: string;
  resolveLocation(query: LocationQuery, signal?: AbortSignal): Promise<ResolvedLocation>;
  fetchWeather(location: ResolvedLocation, options: FetchOptions): Promise<ProviderWeather>;
  /** 城市名联想；失败时上层会忽略，不影响手输搜索 */
  searchCities(keyword: string, signal?: AbortSignal): Promise<CitySuggestion[]>;
}
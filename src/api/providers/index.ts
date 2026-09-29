import { ACTIVE_PROVIDER, type ProviderId } from '../config';
import { openWeatherProvider } from './openweather';
import { qweatherProvider } from './qweather';
import type { WeatherProvider } from './types';

const PROVIDERS: Record<ProviderId, WeatherProvider> = {
  qweather: qweatherProvider,
  openweathermap: openWeatherProvider,
};

/** 取当前启用的数据源，默认由 VITE_WEATHER_PROVIDER 决定 */
export function getProvider(id: ProviderId = ACTIVE_PROVIDER): WeatherProvider {
  return PROVIDERS[id] ?? qweatherProvider;
}

export type { WeatherProvider, ProviderWeather, FetchOptions } from './types';
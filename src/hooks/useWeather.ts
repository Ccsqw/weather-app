import { useCallback, useEffect, useState } from 'react';
import { ApiError, toUserMessage } from '../api/error';
import { locationCacheKey, type LocationQuery } from '../api/location';
import { getWeather } from '../api/weather';
import type { WeatherData } from '../types/weather';

export type WeatherStatus = 'loading' | 'ok' | 'error';

export interface UseWeatherResult {
  status: WeatherStatus;
  data?: WeatherData;
  message?: string;
  code?: string;
  reload: () => void;
}

/**
 * 拉取并缓存一整屏所需数据。
 * 依赖用 locationCacheKey(query) 而不是 query 对象本身，
 * 这样调用方每次渲染新建 query 对象也不会重复请求。
 */
export function useWeather(query: LocationQuery, options: { days?: 3 | 7 } = {}): UseWeatherResult {
  const days = options.days ?? 7;
  const queryKey = locationCacheKey(query);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<{ status: WeatherStatus; data?: WeatherData; message?: string; code?: string }>({
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();
    // 保留上一次的数据，切换城市时不会先闪一下骨架屏
    setState((previous) => ({ status: 'loading', data: previous.data }));

    getWeather(query, { days, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ok', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: toUserMessage(error),
          code: ApiError.is(error) ? error.code : undefined,
        });
      });

    return () => controller.abort();
    // queryKey 已经能代表 query 的内容，刻意不把 query 放进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, days, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { ...state, reload };
}
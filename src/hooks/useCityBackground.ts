import { useCallback, useEffect, useState } from 'react';
import { getCityBackground } from '../api/background';
import { locationCacheKey, type LocationQuery } from '../api/location';
import { readFlag, writeFlag } from '../utils/storage';
import type { BackgroundImage } from '../types/weather';

/** 开关存本地，下次打开还记得 */
const PREFERENCE_KEY = 'weather-app:background-enabled:v1';

/**
 * 城市照片背景开关。
 * 默认关：会请求外部图库、且照片按协议需要署名，交给用户自己选。
 */
export function useBackgroundPreference() {
  const [enabled, setEnabled] = useState(() => readFlag(PREFERENCE_KEY, false));

  useEffect(() => {
    writeFlag(PREFERENCE_KEY, enabled);
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((previous) => !previous), []);

  return { enabled, toggle };
}

export interface CityBackgroundResult {
  image: BackgroundImage | null;
  loading: boolean;
}

export function useCityBackground(
  query: LocationQuery | null,
  enabled: boolean,
): CityBackgroundResult {
  const [image, setImage] = useState<BackgroundImage | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheKey = query ? locationCacheKey(query) : '';

  useEffect(() => {
    if (!enabled || !query) {
      setImage(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    getCityBackground(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setImage(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setImage(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // 用 cacheKey 而不是 query 对象，避免调用方每次渲染新建对象导致重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  return { image, loading };
}
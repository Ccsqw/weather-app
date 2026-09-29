import { useEffect, useMemo, useState } from 'react';
import { searchCities } from '../api/weather';
import type { CitySuggestion } from '../types/weather';
import { DEFAULT_SUGGEST_LIMIT, mergeSuggestions, suggestCities } from '../utils/citySuggest';
import type { FavoriteCity } from '../utils/favorites';

/** 接口联想的防抖时间，避免每敲一个字都打接口 */
const REMOTE_DEBOUNCE_MS = 250;

export interface CitySuggestionsResult {
  suggestions: CitySuggestion[];
  /** 接口联想请求中 */
  loading: boolean;
}

export function useCitySuggestions(keyword: string, favorites: FavoriteCity[]): CitySuggestionsResult {
  // 本地城市库 + 收藏，同步出结果
  const local = useMemo(
    () => suggestCities(keyword, { favorites, limit: DEFAULT_SUGGEST_LIMIT }),
    [keyword, favorites],
  );

  const [remote, setRemote] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const localCount = local.length;

  useEffect(() => {
    const trimmed = keyword.trim();

    // 本地已经凑够结果就不打接口了；空输入也直接清空
    if (trimmed === '' || localCount >= DEFAULT_SUGGEST_LIMIT) {
      setRemote([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCities(trimmed, controller.signal)
        .then((list) => {
          if (!controller.signal.aborted) setRemote(list);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemote([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, REMOTE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, localCount]);

  const suggestions = useMemo(
    () => mergeSuggestions(local, remote, DEFAULT_SUGGEST_LIMIT),
    [local, remote],
  );

  return { suggestions, loading };
}
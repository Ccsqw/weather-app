import { useCallback, useEffect, useState } from 'react';
import { locationCacheKey, type LocationQuery } from '../api/location';
import {
  isFavorite,
  loadFavorites,
  removeFavorite,
  saveFavorites,
  toggleFavorite,
  type FavoriteCity,
} from '../utils/favorites';

export interface UseFavoritesResult {
  favorites: FavoriteCity[];
  isFavorite: (query: LocationQuery) => boolean;
  /** 已收藏则取消，未收藏则加入 */
  toggle: (query: LocationQuery, name: string) => void;
  remove: (id: string) => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteCity[]>(() => loadFavorites());

  // 任何变更都落盘；localStorage 不可用时 saveFavorites 内部会静默跳过
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggle = useCallback((query: LocationQuery, name: string) => {
    setFavorites((previous) => toggleFavorite(previous, query, name, Date.now()));
  }, []);

  const remove = useCallback((id: string) => {
    setFavorites((previous) => removeFavorite(previous, id));
  }, []);

  const has = useCallback(
    (query: LocationQuery) => favorites.some((item) => item.id === locationCacheKey(query)),
    [favorites],
  );

  return { favorites, isFavorite: has, toggle, remove };
}

export { isFavorite };
/**
 * 收藏城市的纯逻辑：解析、增删、读写 localStorage。
 * 不依赖 React，方便单测；localStorage 通过参数注入，测试时传假实现即可。
 */

import { locationCacheKey, type LocationQuery } from '../api/location';
import { safeStorage, type StorageLike } from './storage';

/** 带版本号，将来改结构不会把老数据读崩 */
export const FAVORITES_STORAGE_KEY = 'weather-app:favorites:v1';

/** 上限，避免无限增长 */
export const MAX_FAVORITES = 20;

export interface FavoriteCity {
  /** 用 locationCacheKey 当唯一标识，天然去重 */
  id: string;
  /** 展示名，来自接口返回的城市名 */
  name: string;
  /** 完整查询条件，收藏坐标也能正常回查 */
  query: LocationQuery;
  addedAt: number;
}

export function createFavorite(query: LocationQuery, name: string, addedAt: number): FavoriteCity {
  return { id: locationCacheKey(query), name, query, addedAt };
}

/** 已存在就取消收藏，不存在就加到最前面；超过上限丢掉最旧的 */
export function toggleFavorite(
  list: FavoriteCity[],
  query: LocationQuery,
  name: string,
  addedAt: number,
): FavoriteCity[] {
  const id = locationCacheKey(query);
  if (list.some((item) => item.id === id)) {
    return list.filter((item) => item.id !== id);
  }

  return [createFavorite(query, name, addedAt), ...list].slice(0, MAX_FAVORITES);
}

export function removeFavorite(list: FavoriteCity[], id: string): FavoriteCity[] {
  return list.filter((item) => item.id !== id);
}

export function isFavorite(list: FavoriteCity[], query: LocationQuery): boolean {
  const id = locationCacheKey(query);
  return list.some((item) => item.id === id);
}

/** 解析存储内容，脏数据直接丢掉而不是整份清空 */
export function parseFavorites(raw: string | null): FavoriteCity[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoriteCity).slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function loadFavorites(storage: StorageLike | null = safeStorage()): FavoriteCity[] {
  if (!storage) return [];

  try {
    return parseFavorites(storage.getItem(FAVORITES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveFavorites(list: FavoriteCity[], storage: StorageLike | null = safeStorage()): void {
  if (!storage) return;

  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 隐私模式或超配额：忽略写入失败，功能降级为「本次会话有效」
  }
}

function isFavoriteCity(value: unknown): value is FavoriteCity {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<FavoriteCity>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.addedAt === 'number' &&
    isLocationQuery(item.query)
  );
}

function isLocationQuery(value: unknown): value is LocationQuery {
  if (!value || typeof value !== 'object') return false;

  const query = value as { kind?: unknown; city?: unknown; lat?: unknown; lon?: unknown };
  if (query.kind === 'city') return typeof query.city === 'string' && query.city.length > 0;
  if (query.kind === 'coords') return Number.isFinite(query.lat) && Number.isFinite(query.lon);
  return false;
}
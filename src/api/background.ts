/**
 * 城市背景图：解析地点 -> 按经纬度找图 -> 缓存。
 * 任何一步失败都返回 null，调用方保留渐变兜底，不影响主流程。
 */

import { locationCacheKey, type LocationQuery } from './location';
import { wikimediaBackgroundProvider } from './providers/wikimedia';
import type { BackgroundProvider } from './providers/background.types';
import { resolveCityLocation } from './weather';
import { readJson, writeJson } from '../utils/storage';
import type { BackgroundImage } from '../types/weather';

/** 带版本号，改结构不会读崩老数据 */
const STORAGE_KEY = 'weather-app:background:v1';

const provider: BackgroundProvider = wikimediaBackgroundProvider;

/** 同一城市同一天只解析一次，避免来回切页重复请求 */
const memoryCache = new Map<string, BackgroundImage | null>();

interface StoredEntry {
  /** YYYY-MM-DD */
  date: string;
  image: BackgroundImage;
}

type StoredMap = Record<string, StoredEntry>;

/** 本地日期戳，用来实现「同一天同一城市固定一张」 */
export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getCityBackground(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<BackgroundImage | null> {
  const cacheKey = locationCacheKey(query);
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  // 当天已经取过就直接用，不再打接口
  const today = todayKey();
  const stored = readJson<StoredMap>(STORAGE_KEY) ?? {};
  const cached = stored[cacheKey];
  if (cached?.date === today && cached.image?.url) {
    memoryCache.set(cacheKey, cached.image);
    return cached.image;
  }

  try {
    const location = await resolveCityLocation(query, signal);
    const image = await provider.resolve(location, `${cacheKey}|${today}`, signal);

    memoryCache.set(cacheKey, image);
    if (image) writeJson(STORAGE_KEY, { ...stored, [cacheKey]: { date: today, image } });
    return image;
  } catch (error) {
    // 主动取消要原样抛出；其余（网络、接口、城市查不到）一律降级成「没有背景图」
    if (isAbortError(error)) throw error;

    memoryCache.set(cacheKey, null);
    return null;
  }
}

export function clearBackgroundCache(): void {
  memoryCache.clear();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : (error as { name?: string })?.name === 'AbortError';
}
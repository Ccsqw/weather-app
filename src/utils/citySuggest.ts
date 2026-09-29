/**
 * 城市名联想：本地即时匹配（纯函数，不依赖 React）。
 * 收藏的城市排最前，其次按「名称前缀 > 拼音前缀 > 名称包含 > 拼音包含」排序。
 */

import { CN_CITIES } from '../data/cities';
import type { CitySuggestion } from '../types/weather';
import type { FavoriteCity } from './favorites';

export interface SuggestOptions {
  favorites?: FavoriteCity[];
  limit?: number;
}

export const DEFAULT_SUGGEST_LIMIT = 8;

export function suggestCities(keyword: string, options: SuggestOptions = {}): CitySuggestion[] {
  const query = keyword.trim().toLowerCase();
  if (query === '') return [];

  const limit = options.limit ?? DEFAULT_SUGGEST_LIMIT;
  const scored: Array<{ item: CitySuggestion; score: number }> = [];
  const seen = new Set<string>();

  const push = (item: CitySuggestion, score: number) => {
    if (!item.name || seen.has(item.name)) return;
    seen.add(item.name);
    scored.push({ item, score });
  };

  // 收藏优先，加 100 分保证排在最前
  for (const favorite of options.favorites ?? []) {
    const score = matchScore(favorite.name.toLowerCase(), '', query);
    if (score > 0) push({ name: favorite.name, source: 'favorite' }, score + 100);
  }

  for (const city of CN_CITIES) {
    const score = matchScore(city.name.toLowerCase(), city.pinyin, query);
    if (score > 0) push({ name: city.name, adm: city.province, pinyin: city.pinyin, source: 'local' }, score);
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'zh-Hans-CN'))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** 名称前缀 4 分 > 拼音前缀 3 分 > 名称包含 2 分 > 拼音包含 1 分 */
function matchScore(name: string, pinyin: string, query: string): number {
  if (name.startsWith(query)) return 4;
  if (pinyin !== '' && pinyin.startsWith(query)) return 3;
  if (name.includes(query)) return 2;
  if (pinyin !== '' && pinyin.includes(query)) return 1;
  return 0;
}

/** 本地结果 + 接口结果合并去重 */
export function mergeSuggestions(
  local: CitySuggestion[],
  remote: CitySuggestion[],
  limit = DEFAULT_SUGGEST_LIMIT,
): CitySuggestion[] {
  const seen = new Set(local.map((item) => item.name));
  const merged = [...local];

  for (const item of remote) {
    if (!item.name || seen.has(item.name)) continue;
    seen.add(item.name);
    merged.push(item);
  }

  return merged.slice(0, limit);
}
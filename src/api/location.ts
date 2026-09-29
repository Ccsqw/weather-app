/**
 * 地点查询的公共部分：统一对外暴露 LocationQuery，
 * 具体怎么换成数据源需要的地点参数，由各 provider 自己实现。
 */

import { ApiError } from './error';
import type { ProviderId } from './config';

export type LocationQuery =
  | { kind: 'city'; city: string; adm?: string }
  | { kind: 'coords'; lon: number; lat: number };

export interface ResolvedLocation {
  /** 数据源使用的地点标识：和风天气是 LocationID，OWM 是 "纬度,经度" */
  id: string;
  name: string;
  adm1?: string;
  adm2?: string;
  country?: string;
  lat?: number;
  lon?: number;
  /** coords = 直接用坐标查询；lookup = 经城市搜索得到 */
  source: 'coords' | 'lookup';
}

/**
 * 按城市名查询，可附带上级行政区消歧，如 byCity('朝阳区', '北京市')。
 * 没有 adm 时不带这个键，保证对象能原样 JSON 往返（收藏要存起来）。
 */
export function byCity(city: string, adm?: string): LocationQuery {
  const name = city.trim();
  const parent = adm?.trim();

  return parent ? { kind: 'city', city: name, adm: parent } : { kind: 'city', city: name };
}

/** 按经纬度查询（纬度 -90~90，经度 -180~180） */
export function byCoords(lat: number, lon: number): LocationQuery {
  return { kind: 'coords', lat, lon };
}

export function describeQuery(query: LocationQuery): string {
  return query.kind === 'coords' ? `${query.lon},${query.lat}` : [query.adm, query.city].filter(Boolean).join(' ');
}

/** 给 React 当依赖用的稳定字符串（不含 provider，方便 UI 侧复用） */
export function locationCacheKey(query: LocationQuery): string {
  return query.kind === 'coords'
    ? `coords:${query.lon.toFixed(4)},${query.lat.toFixed(4)}`
    : `city:${query.adm ?? ''}|${query.city}`;
}

/** 经纬度入参校验 + 组装，两个 provider 共用 */
export function fromCoordsQuery(query: Extract<LocationQuery, { kind: 'coords' }>): ResolvedLocation {
  const { lat, lon } = query;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiError('CONFIG', '经纬度必须是有效数字');
  }
  if (lat < -90 || lat > 90) {
    throw new ApiError('CONFIG', `纬度超出范围（-90~90）：${lat}`);
  }
  if (lon < -180 || lon > 180) {
    throw new ApiError('CONFIG', `经度超出范围（-180~180）：${lon}`);
  }

  return { id: `${lat.toFixed(4)},${lon.toFixed(4)}`, name: '当前位置', lat, lon, source: 'coords' };
}

const locationCache = new Map<string, ResolvedLocation>();

export function clearLocationCache(): void {
  locationCache.clear();
}

/** 同一数据源 + 同一查询只解析一次，结果缓存在内存里 */
export function resolveWithCache(
  providerId: ProviderId,
  query: LocationQuery,
  loader: (query: LocationQuery) => Promise<ResolvedLocation>,
): Promise<ResolvedLocation> {
  const key = `${providerId}|${locationCacheKey(query)}`;
  const cached = locationCache.get(key);
  if (cached) return Promise.resolve(cached);

  return loader(query).then((resolved) => {
    locationCache.set(key, resolved);
    return resolved;
  });
}
import { PUBLIC_AUTH, requestJson } from '../client';
import type { BackgroundImage } from '../../types/weather';
import type { BackgroundProvider } from './background.types';

/**
 * Wikimedia Commons 按经纬度找附近照片。
 * 免 key、可跨域（origin=*），但照片质量参差，必须做过滤。
 */

const COMMONS_API = 'https://commons.wikimedia.org';
/** 搜索半径：米 */
const SEARCH_RADIUS_M = 10000;
const SEARCH_LIMIT = 50;
/** 缩略图宽度，手机屏够用又省流量 */
const THUMB_WIDTH = 1080;

/** 过滤门槛：宁可少几张，也不能把地图、图标、全景长图当成城市照片 */
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 800;
const MIN_RATIO = 0.55;
const MAX_RATIO = 2.4;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);
const BAD_TITLE = /(map|flag|logo|diagram|chart|plan|coat|seal|emblem|icon|svg|pdf|poster|stamp|banner)/i;

export interface WikimediaImageInfo {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
}

export interface WikimediaCandidate {
  title?: string;
  /** 注意：接口返回的字段名是 imageinfo，且是数组，取第一个 */
  imageinfo?: WikimediaImageInfo[];
}

interface CommonsResponse {
  query?: { pages?: Record<string, WikimediaCandidate> };
}

/** 这张图适合当背景吗 */
export function isUsablePhoto(candidate: WikimediaCandidate): boolean {
  const info = candidate.imageinfo?.[0];
  if (!info) return false;
  if (!info.mime || !ALLOWED_MIME.has(info.mime)) return false;
  if (!info.url && !info.thumburl) return false;

  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (width < MIN_WIDTH || height < MIN_HEIGHT) return false;

  const ratio = width / Math.max(height, 1);
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return false;
  if (BAD_TITLE.test(candidate.title ?? '')) return false;

  return true;
}

/** FNV-1a 哈希：同一个 seed 永远选到同一张 */
export function pickIndex(seed: string, length: number): number {
  if (length <= 0) return 0;

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

export function toBackgroundImage(candidate: WikimediaCandidate): BackgroundImage | null {
  const info = candidate.imageinfo?.[0];
  if (!info) return null;

  const url = info.thumburl || info.url;
  if (!url) return null;

  return {
    url,
    title: candidate.title?.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, ''),
    author: plainText(info.extmetadata?.Artist?.value),
    sourceUrl: info.descriptionurl,
  };
}

/** extmetadata 里的作者是个 HTML 片段，转成纯文本并截断 */
function plainText(html?: string): string | undefined {
  if (!html) return undefined;

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return undefined;
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

export const wikimediaBackgroundProvider: BackgroundProvider = {
  id: 'wikimedia',

  async resolve(location, seed, signal) {
    if (location.lat === undefined || location.lon === undefined) return null;

    const response = await requestJson<CommonsResponse>('/w/api.php', {
      baseUrl: COMMONS_API,
      auth: PUBLIC_AUTH,
      params: {
        action: 'query',
        format: 'json',
        origin: '*',
        // ggsnamespace=6 是关键：只搜 File 命名空间，否则搜到的是条目
        generator: 'geosearch',
        ggscoord: `${location.lat}|${location.lon}`,
        ggsradius: SEARCH_RADIUS_M,
        ggslimit: SEARCH_LIMIT,
        ggsnamespace: 6,
        prop: 'imageinfo',
        iiprop: 'url|size|mime|extmetadata',
        iiurlwidth: THUMB_WIDTH,
      },
      signal,
    });

    const candidates = Object.values(response.query?.pages ?? {})
      .filter(isUsablePhoto)
      // 先按标题排序：接口返回顺序变了也不会影响选图结果
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'en'));

    if (candidates.length === 0) return null;

    return toBackgroundImage(candidates[pickIndex(seed, candidates.length)]);
  },
};
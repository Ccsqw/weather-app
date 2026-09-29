import type { ResolvedLocation } from '../location';
import type { BackgroundImage } from '../../types/weather';

/**
 * 背景图数据源。和天气数据源一样做成可插拔的：
 * 以后加 Pexels / 高德静态地图，只要实现这个接口，UI 和缓存层都不用改。
 */
export interface BackgroundProvider {
  id: 'wikimedia' | 'pexels' | 'local';
  /**
   * @param seed 用于「同一天同一城市固定同一张图」的确定性选图
   * @returns 没有合适图片时返回 null（调用方会保留渐变兜底）
   */
  resolve(
    location: ResolvedLocation,
    seed: string,
    signal?: AbortSignal,
  ): Promise<BackgroundImage | null>;
}
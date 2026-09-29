/** 各数据源共用的字段处理与小工具 */

import type { AqiLevel } from '../../types/weather';

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 保留一位小数（气温、风速这类字段用得上） */
export function round1(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

export const AQI_ADVICE: Record<AqiLevel, string> = {
  '优': '适宜户外运动',
  '良': '可正常进行户外活动',
  '轻度污染': '敏感人群减少长时间户外活动',
  '中度污染': '减少户外运动，外出建议戴口罩',
  '重度污染': '避免户外活动，外出戴口罩',
  '严重污染': '尽量留在室内并关闭门窗',
};

export function mapAqiAdvice(level: AqiLevel | null): string | null {
  return level ? AQI_ADVICE[level] : null;
}

/**
 * OpenWeatherMap 空气质量接口只给 1~5 的等级索引，不是国标 AQI 数值，
 * 这里按官方分级映射到中文等级。
 */
export const OWM_AQI_LEVELS: Record<number, AqiLevel> = {
  1: '优',
  2: '良',
  3: '轻度污染',
  4: '中度污染',
  5: '重度污染',
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 第 1、2 行固定显示今天/明天，其余按星期显示 */
export function dayLabel(index: number, weekday?: number | null): string {
  if (index === 0) return '今天';
  if (index === 1) return '明天';
  if (weekday === null || weekday === undefined || weekday < 0 || weekday > 6) return '--';
  return `周${WEEKDAYS[weekday]}`;
}
/** 相对今天的标签：0 = 今天，1 = 明天，其余按星期 */
export function relativeDayLabel(offsetDays: number | null, weekday: number | null): string {
  if (offsetDays === 0) return '今天';
  if (offsetDays === 1) return '明天';
  if (weekday === null || weekday < 0 || weekday > 6) return '--';
  return `周${WEEKDAYS[weekday]}`;
}

/** 两个 YYYY-MM-DD 相差几天 */
export function daysBetween(fromDate: string | null | undefined, toDate: string): number | null {
  const from = parseIsoDate(fromDate);
  const to = parseIsoDate(toDate);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function parseIsoDate(value: string | null | undefined): Date | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!matched) return null;
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
}
/** 展示层格式化工具：所有可能缺失的字段统一降级为 "--" */

export const DEGREE = '\u00B0';

export function formatTemp(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return `--${DEGREE}`;
  return `${Math.round(value)}${DEGREE}`;
}

export function formatTempRange(min: number | null | undefined, max: number | null | undefined): string {
  return `${formatTemp(min)} / ${formatTemp(max)}`;
}

export function formatValue(value: number | null | undefined, unit = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${value}${unit}`;
}

export function formatText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '--';
}
import type { DailyItem } from '../../types/weather';
import { formatTemp } from '../../utils/format';
import { Card, CardTitle } from '../Card';
import { WeatherIcon } from '../WeatherIcon';
import { TempRangeBar } from './TempRangeBar';

/** 10 天预报：日期 + 图标 + 温度区间条 + 温度范围 */
export function DailyCard({ items }: { items: DailyItem[] }) {
  if (items.length === 0) return null;

  const min = Math.min(...items.map((item) => item.tempMin));
  const max = Math.max(...items.map((item) => item.tempMax));

  return (
    <Card>
      <CardTitle icon="calendar">10 天预报</CardTitle>
      <ul className="mt-1">
        {items.map((item) => (
          <li key={item.date || item.day} className="flex items-center gap-3 py-2">
            <span className="w-9 shrink-0 text-[14px]">{item.day}</span>
            <WeatherIcon name={item.icon} className="h-5 w-5 shrink-0" />
            <TempRangeBar min={min} max={max} dayMin={item.tempMin} dayMax={item.tempMax} />
            <span className="w-[68px] shrink-0 text-right text-[14px] tabular-nums text-white/90">
              {Math.round(item.tempMin)}~{formatTemp(item.tempMax)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
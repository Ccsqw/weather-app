import type { HourlyItem } from '../../types/weather';
import { formatTemp } from '../../utils/format';
import { Card, CardTitle } from '../Card';
import { WeatherIcon } from '../WeatherIcon';

/** 逐小时预报：横向 5 列，超出横向滚动 */
export function HourlyCard({ items }: { items: HourlyItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardTitle icon="clock">每小时预报</CardTitle>
      <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
        {items.map((item, index) => (
          <div
            key={item.time || index}
            className="flex w-14 shrink-0 flex-col items-center gap-2"
          >
            <span className="text-[13px] text-white/75">{item.label}</span>
            <WeatherIcon name={item.icon} className="h-6 w-6" />
            <span className="text-[15px] tabular-nums text-white/75">{formatTemp(item.temp)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
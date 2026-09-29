import type { DailyItem, HourlyItem, RainInfo } from '../../types/weather';
import { DailyCard } from '../cards/DailyCard';
import { HourlyCard } from '../cards/HourlyCard';
import { RainCard } from '../cards/RainCard';

interface Props {
  rain: RainInfo;
  hourly: HourlyItem[];
  daily: DailyItem[];
}

export function ForecastPage({ rain, hourly, daily }: Props) {
  return (
    <div className="space-y-3">
      <RainCard rain={rain} />
      <HourlyCard items={hourly} />
      <DailyCard items={daily} />
    </div>
  );
}
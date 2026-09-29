import type { CurrentWeather } from '../../types/weather';
import { DetailGrid } from '../cards/DetailGrid';

export function DetailPage({ current }: { current: CurrentWeather }) {
  return (
    <div>
      <h2 className="mb-4 mt-2 text-[26px] font-semibold">详细数据</h2>
      <DetailGrid current={current} />
    </div>
  );
}
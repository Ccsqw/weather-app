import type { RainInfo } from '../../types/weather';
import { Card, CardTitle } from '../Card';

export function RainCard({ rain }: { rain: RainInfo }) {
  return (
    <Card>
      <CardTitle icon="rain">降雨预报</CardTitle>
      <p className="mt-2 text-[15px] leading-relaxed">{rain.summary}</p>
    </Card>
  );
}
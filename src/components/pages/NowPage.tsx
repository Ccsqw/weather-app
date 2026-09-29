import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import type { AqiLevel, CurrentWeather } from '../../types/weather';
import { formatTemp, formatText } from '../../utils/format';

interface Props {
  city: string;
  current: CurrentWeather;
}

/** AQI 等级 -> 徽章配色，P0 主用「优」的绿色 */
const AQI_BADGE: Record<AqiLevel, string> = {
  '优': 'bg-good text-white',
  '良': 'bg-[#FFCC00] text-black',
  '轻度污染': 'bg-[#FF9500] text-white',
  '中度污染': 'bg-[#FF3B30] text-white',
  '重度污染': 'bg-[#AF52DE] text-white',
  '严重污染': 'bg-[#8E0000] text-white',
};

export function NowPage({ city, current }: Props) {
  const badgeClass = current.aqiLevel ? AQI_BADGE[current.aqiLevel] : 'bg-white/25 text-white';
  // 切换城市时数字滚过去，而不是直接跳变
  const temp = useAnimatedNumber(current.temp);

  return (
    <div className="flex h-full flex-col">
      <header className="pt-14 text-center">
        <h1 className="text-city">{formatText(city)}</h1>
        <p className="mt-1.5 text-[17px] text-white/80">{formatText(current.condition)}</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center pb-6">
        <p className="text-temp tabular-nums">{formatTemp(temp)}</p>
        <p className="mt-5 text-[15px] text-white/80">
          最高 {formatTemp(current.tempMax)} 最低 {formatTemp(current.tempMin)}
        </p>
      </div>

      <div className="card-fallback mb-12 flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-card">
        <span className="shrink-0 text-[15px] font-semibold tabular-nums">AQI {current.aqi ?? '--'}</span>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[13px] font-semibold ${badgeClass}`}>
          {current.aqiLevel ?? '--'}
        </span>
        <span className="ml-auto truncate pl-2 text-[13px] text-white/90">
          {current.aqiAdvice ?? '暂无建议'}
        </span>
      </div>
    </div>
  );
}
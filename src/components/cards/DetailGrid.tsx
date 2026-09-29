import type { CurrentWeather } from '../../types/weather';
import { formatTemp, formatText, formatValue } from '../../utils/format';
import { WeatherIcon, type IconName } from '../WeatherIcon';

interface Metric {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
}

export function DetailGrid({ current }: { current: CurrentWeather }) {
  const metrics: Metric[] = [
    { icon: 'sunny', label: '紫外线', value: formatValue(current.uvIndex), sub: describeUv(current.uvIndex) },
    { icon: 'sunset', label: '日落', value: formatText(current.sunset), sub: `日出 ${formatText(current.sunrise)}` },
    {
      icon: 'wind',
      label: '风',
      value: current.windScale === null ? '--' : `${current.windScale}级`,
      sub: describeWind(current),
    },
    {
      icon: 'humidity',
      label: '湿度',
      value: current.humidity === null ? '--' : `${current.humidity}%`,
      sub: `露点 ${formatTemp(current.dewPoint)}`,
    },
    {
      icon: 'visibility',
      label: '能见度',
      value: current.visibility === null ? '--' : `${current.visibility}km`,
      sub: describeVisibility(current.visibility),
    },
    {
      icon: 'feels-like',
      label: '体感',
      value: formatTemp(current.feelsLike),
      sub: describeFeelsLike(current.feelsLike, current.temp),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="card-fallback rounded-card bg-white/15 p-4 backdrop-blur-card">
          <div className="flex items-center gap-1.5 text-[13px] text-white/75">
            <WeatherIcon name={metric.icon} tone="mono" className="h-[18px] w-[18px] shrink-0" />
            <span>{metric.label}</span>
          </div>
          <p className="mt-2 text-metric tabular-nums">{metric.value}</p>
          <p className="mt-1 text-[12px] text-white/65">{metric.sub}</p>
        </div>
      ))}
    </div>
  );
}

/** 风：优先显示「东北风 18km/h」 */
function describeWind(current: CurrentWeather): string {
  const parts: string[] = [];

  if (current.windDir?.trim()) parts.push(current.windDir.trim());
  if (current.windSpeed !== null && Number.isFinite(current.windSpeed)) {
    parts.push(`${Math.round(current.windSpeed)}km/h`);
  }

  return parts.join(' ') || '--';
}

function describeUv(uv: number | null): string {
  if (uv === null) return '暂无数据';
  if (uv <= 2) return '低';
  if (uv <= 5) return '中等';
  if (uv <= 7) return '高';
  if (uv <= 10) return '很高';
  return '极高';
}

function describeVisibility(km: number | null): string {
  if (km === null) return '暂无数据';
  if (km < 1) return '较差';
  if (km < 5) return '一般';
  if (km <= 10) return '良好';
  return '视野通透';
}

function describeFeelsLike(feels: number | null, temp: number): string {
  if (feels === null) return '暂无数据';
  const diff = feels - temp;
  if (Math.abs(diff) <= 2) return '较舒适';
  return diff > 0 ? '体感偏热' : '体感偏冷';
}
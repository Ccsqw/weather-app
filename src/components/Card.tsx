import type { ReactNode } from 'react';
import { WeatherIcon, type IconName } from './WeatherIcon';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-fallback rounded-card bg-white/15 p-4 backdrop-blur-card ${className}`}>{children}</div>
  );
}

/** 卡片标题行：小图标 + 浅色小字 */
export function CardTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[14px] text-white/75">
      <WeatherIcon name={icon} className="h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
interface Props {
  /** 全时段最低温 */
  min: number;
  /** 全时段最高温 */
  max: number;
  /** 当天最低温 */
  dayMin: number;
  /** 当天最高温 */
  dayMax: number;
}

/**
 * 温度区间条：高亮段的位置与长度由当天温度在整体温区间中的占比决定。
 * 长度设了 8% 下限，保证温差很小的那天也看得见。
 */
export function TempRangeBar({ min, max, dayMin, dayMax }: Props) {
  const span = Math.max(max - min, 1);
  const left = ((dayMin - min) / span) * 100;
  const width = Math.max(((dayMax - dayMin) / span) * 100, 8);

  return (
    <div className="relative h-1 min-w-0 flex-1 rounded-full bg-white/25">
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: 'linear-gradient(90deg, #6FD8F5, #FFD84D)',
        }}
      />
    </div>
  );
}
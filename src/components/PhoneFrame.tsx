import type { ReactNode } from 'react';

/**
 * 桌面端把内容装进手机外壳居中展示；真机 / 窄屏直接全屏铺满。
 *
 * 机身结构（由外到内）：
 * 机身金属渐变 -> 屏幕内缩 11px 留出黑边 -> 屏幕内放灵动岛 / Home 指示条 / 反光
 * 侧键贴在机身外侧，所以机身本身不能 overflow-hidden。
 */

/** 侧键位置按真机比例放：左侧静音键 + 音量键，右侧电源键 */
const SIDE_BUTTONS = [
  { side: 'left', top: '15.5%', height: '4%' },
  { side: 'left', top: '23%', height: '7.5%' },
  { side: 'left', top: '32.5%', height: '7.5%' },
  { side: 'right', top: '27%', height: '11%' },
] as const;

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-[radial-gradient(circle_at_50%_25%,#1c1c20,#000_70%)] sm:items-center sm:py-6">
      <div className="relative h-[100dvh] w-full sm:aspect-[375/812] sm:h-[min(812px,calc(100dvh_-_3rem))] sm:w-auto">
        {/* 机身：金属渐变 + 边缘高光 + 大投影 */}
        <div
          className="pointer-events-none absolute inset-0 hidden rounded-[54px] bg-gradient-to-b from-[#4b4b4e] via-[#1b1b1d] to-[#3b3b3e] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.28)] sm:block"
        />

        {/* 屏幕 */}
        <div className="absolute inset-0 overflow-hidden bg-sky-from sm:inset-[11px] sm:rounded-[44px] sm:ring-1 sm:ring-black/70">
          {children}

          {/* 灵动岛 */}
          <div className="pointer-events-none absolute left-1/2 top-[10px] z-20 hidden h-[33px] w-[116px] -translate-x-1/2 rounded-full bg-black sm:block">
            <span className="absolute right-[9px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-[#15161a]" />
          </div>

          {/* Home 指示条 */}
          <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-20 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/35 sm:block" />

          {/* 屏幕反光：只压一条很淡的斜向高光 */}
          <div className="pointer-events-none absolute inset-0 z-20 hidden bg-gradient-to-br from-white/[0.07] via-transparent to-transparent sm:block" />
        </div>

        {/* 侧键 */}
        {SIDE_BUTTONS.map((button, index) => (
          <div
            key={index}
            className={`absolute hidden w-[4px] bg-gradient-to-b from-[#4a4a4d] to-[#26262a] sm:block ${
              button.side === 'left' ? '-left-[3px] rounded-l-[3px]' : '-right-[3px] rounded-r-[3px]'
            }`}
            style={{ top: button.top, height: button.height }}
          />
        ))}
      </div>
    </div>
  );
}
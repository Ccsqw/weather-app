import { useEffect, useRef, useState } from 'react';

/** easeOutCubic：起步快、收尾稳，数字滚动用它最自然 */
export function easeOutCubic(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** 按进度在两值之间插值（独立出来方便单测） */
export function tweenValue(from: number, to: number, progress: number): number {
  return from + (to - from) * easeOutCubic(progress);
}

/**
 * 数值变化时滚动过去，而不是直接跳变。
 * 首帧直接返回目标值：初始渲染不做动画，只有切换城市时才滚。
 */
export function useAnimatedNumber(target: number, durationMs = 620): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;

    if (!Number.isFinite(target) || from === target) {
      fromRef.current = target;
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const started = performance.now();

    const tick = (now: number) => {
      const next = tweenValue(from, target, (now - started) / durationMs);
      displayRef.current = next;
      setDisplay(next);

      if (now - started < durationMs) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        fromRef.current = target;
        setDisplay(target);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // 动画被打断时从当前显示值继续滚，不要跳回起点
      fromRef.current = displayRef.current;
    };
  }, [target, durationMs]);

  return display;
}
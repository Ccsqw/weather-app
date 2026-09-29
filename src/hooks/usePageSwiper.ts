import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface PageSwiper {
  ref: React.RefObject<HTMLDivElement>;
  index: number;
  /** 鼠标拖拽中 */
  dragging: boolean;
  onScroll: () => void;
  goTo: (target: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
}

/** 位移小于这个值算点击，不当成拖拽 */
const DRAG_THRESHOLD_PX = 4;
/** 松手后吸附动画的时长，动画结束再恢复 scroll-snap */
const SNAP_SETTLE_MS = 340;

/** 由滚动位置反查当前页（独立出来方便单测） */
export function resolvePageIndex(scrollLeft: number, pageWidth: number, count: number): number {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(pageWidth) || pageWidth <= 0) return 0;

  const last = Math.max(count - 1, 0);
  return Math.min(Math.max(Math.round(scrollLeft / pageWidth), 0), last);
}

/**
 * 横向翻页 + 页码联动。
 * 触摸走浏览器原生滚动（手势和惯性都更好），鼠标走 Pointer Events 手动拖拽。
 */
export function usePageSwiper(count: number): PageSwiper {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0, pointerId: -1 });

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (!element || element.clientWidth === 0) return;

    const next = resolvePageIndex(element.scrollLeft, element.clientWidth, count);
    setIndex((previous) => (previous === next ? previous : next));
  }, [count]);

  const goTo = useCallback(
    (target: number) => {
      const element = ref.current;
      if (!element) return;

      const clamped = Math.min(Math.max(target, 0), count - 1);
      element.scrollTo({ left: clamped * element.clientWidth, behavior: 'smooth' });
    },
    [count],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      }
    },
    [goTo, index],
  );

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    // 只接管鼠标左键；触摸交给原生滚动
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    const element = ref.current;
    if (!element) return;

    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startScroll: element.scrollLeft,
      pointerId: event.pointerId,
    };
    // 捕获指针，拖到容器外面也能继续跟随
    element.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    const state = drag.current;
    if (!element || !state.active) return;

    const delta = event.clientX - state.startX;
    if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return;

    if (!state.moved) {
      state.moved = true;
      // 立即关掉 scroll-snap：否则每次改 scrollLeft 都会被强行吸附回去，拖不动
      element.style.scrollSnapType = 'none';
      setDragging(true);
    }

    element.scrollLeft = state.startScroll - delta;
  }, []);

  // 不接 event：pointerId 从 drag state 取，pointercancel 也能复用同一个处理函数
  const onPointerUp = useCallback(() => {
      const element = ref.current;
      const state = drag.current;
      if (!element || !state.active) return;

      state.active = false;
      element.releasePointerCapture?.(state.pointerId);

      if (!state.moved) return; // 只是点击，不动它

      const target = resolvePageIndex(element.scrollLeft, element.clientWidth, count);
      element.scrollTo({ left: target * element.clientWidth, behavior: 'smooth' });
      setIndex(target);

      // 等吸附动画走完再恢复 scroll-snap，中途恢复会把动画打断成瞬移
      window.setTimeout(() => {
        element.style.scrollSnapType = '';
        setDragging(false);
      }, SNAP_SETTLE_MS);
    },
    [count],
  );

  return {
    ref,
    index,
    dragging,
    onScroll,
    goTo,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
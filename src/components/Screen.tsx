import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 内容超高时屏内纵向滚动，不影响横向翻页 */
  scrollable?: boolean;
}

export function Screen({ children, scrollable = false }: Props) {
  return (
    <section className="h-full w-full shrink-0 snap-start overflow-hidden">
      <div
        className={`no-scrollbar h-full overflow-x-hidden px-4 ${
          scrollable ? 'overflow-y-auto pb-14 pt-14' : 'overflow-y-hidden'
        }`}
      >
        {children}
      </div>
    </section>
  );
}
interface Props {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}

/** 底部页码指示器：3 个小圆点，当前页高亮 */
export function PageIndicator({ count, active, onSelect }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`第 ${index + 1} 屏`}
          aria-current={index === active}
          onClick={() => onSelect(index)}
          className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
            index === active ? 'bg-white/95' : 'bg-white/35'
          }`}
        />
      ))}
    </div>
  );
}
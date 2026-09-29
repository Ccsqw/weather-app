/** 转圈加载动画 */
export function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
      aria-hidden="true"
    />
  );
}
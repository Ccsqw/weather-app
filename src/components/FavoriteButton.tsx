import { WeatherIcon } from './WeatherIcon';

interface Props {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/** 收藏当前城市的星标按钮 */
export function FavoriteButton({ active, disabled = false, onToggle }: Props) {
  const label = active ? '取消收藏该城市' : '收藏该城市';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`rounded-full bg-white/15 p-2 backdrop-blur-card transition hover:bg-white/25 disabled:opacity-40 ${
        active ? 'text-amber-300' : 'text-white'
      }`}
    >
      <WeatherIcon name={active ? 'star-filled' : 'star'} className="h-5 w-5" />
    </button>
  );
}
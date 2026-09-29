import type { CitySuggestion } from '../types/weather';
import { Spinner } from './Spinner';
import { WeatherIcon } from './WeatherIcon';

interface Props {
  suggestions: CitySuggestion[];
  loading?: boolean;
  onPick: (name: string) => void;
}

/** 输入城市名时的联想列表：本地城市库 + 接口结果 */
export function SuggestionList({ suggestions, loading = false, onPick }: Props) {
  if (suggestions.length === 0 && !loading) {
    return <p className="mt-4 text-[13px] text-white/60">没有匹配的城市，直接点搜索按输入的名称查</p>;
  }

  return (
    <section className="mt-4" aria-label="搜索建议">
      <h3 className="flex items-center gap-1.5 text-[12px] text-white/60">
        猜你想搜
        {loading && <Spinner className="h-3 w-3" />}
      </h3>
      <ul className="mt-2 space-y-1">
        {suggestions.map((item) => (
          <li key={`${item.source}:${item.name}`}>
            <button
              type="button"
              onClick={() => onPick(item.name)}
              className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left transition hover:bg-white/20"
            >
              <WeatherIcon name="search" className="h-3.5 w-3.5 shrink-0 text-white/45" />
              <span className="shrink-0 text-[15px]">{item.name}</span>
              {item.adm && <span className="truncate text-[12px] text-white/55">{item.adm}</span>}
              {item.source === 'favorite' && (
                <WeatherIcon name="star-filled" className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-300" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
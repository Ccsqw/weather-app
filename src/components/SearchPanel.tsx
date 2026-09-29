import { useEffect, useRef, type FormEvent } from 'react';
import type { CitySuggestion } from '../types/weather';
import type { FavoriteCity } from '../utils/favorites';
import { Spinner } from './Spinner';
import { SuggestionList } from './SuggestionList';
import { WeatherIcon } from './WeatherIcon';

/** 快捷城市，点一下就查 */
const HOT_CITIES = ['上海市', '北京市', '广州市', '深圳市', '杭州市', '成都市'];

interface Props {
  open: boolean;
  /** 天气查询中 */
  loading: boolean;
  /** 查询失败时的友好提示 */
  error?: string;
  /** 输入框内容，由上层持有 */
  keyword: string;
  onKeywordChange: (value: string) => void;
  suggestions: CitySuggestion[];
  /** 接口联想请求中 */
  suggestionsLoading: boolean;
  favorites: FavoriteCity[];
  /** 当前城市的 id，用于高亮 */
  activeId?: string;
  onSearch: (city: string) => void;
  onSelectFavorite: (favorite: FavoriteCity) => void;
  onRemoveFavorite: (id: string) => void;
  onClose: () => void;
}

export function SearchPanel({
  open,
  loading,
  error,
  keyword,
  onKeywordChange,
  suggestions,
  suggestionsLoading,
  favorites,
  activeId,
  onSearch,
  onSelectFavorite,
  onRemoveFavorite,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开就聚焦
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const city = keyword.trim();
    if (!city || loading) return;
    onSearch(city);
  };

  const pick = (city: string) => {
    if (loading) return;
    onKeywordChange(city);
    onSearch(city);
  };

  const typing = keyword.trim() !== '';

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/30 backdrop-blur-md">
      <form
        onSubmit={submit}
        className="no-scrollbar max-h-[78%] overflow-y-auto bg-black/20 px-4 pb-5 pt-7"
      >
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-white/20 px-3 py-2.5">
            <WeatherIcon name="search" className="h-4 w-4 shrink-0 text-white/70" />
            <input
              ref={inputRef}
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="输入城市名称，如 北京市"
              aria-label="城市名称"
              autoComplete="off"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/50 focus:outline-none"
              disabled={loading}
            />
            {keyword !== '' && !loading && (
              <button
                type="button"
                aria-label="清空输入"
                onClick={() => onKeywordChange('')}
                className="shrink-0 rounded-full p-0.5 text-white/55 hover:text-white"
              >
                <WeatherIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <button
            type="submit"
            disabled={loading || !typing}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-[14px] font-medium text-sky-from transition disabled:opacity-40"
          >
            {loading ? '查询中' : '搜索'}
          </button>
        </div>

        <p className="mt-3 flex min-h-[22px] items-start gap-1.5 text-[13px] leading-relaxed" role="status" aria-live="polite">
          {loading ? (
            <>
              <Spinner className="mt-[3px] h-3.5 w-3.5" />
              <span className="text-white/90">正在查询「{keyword.trim()}」</span>
            </>
          ) : error ? (
            <>
              <WeatherIcon name="close" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-white/80" />
              <span>{error}</span>
            </>
          ) : (
            <span className="text-white/60">输入一个字就能联想，也可以直接回车搜索</span>
          )}
        </p>

        {/* 打字中：显示联想；否则显示收藏与快捷城市 */}
        {typing ? (
          <SuggestionList suggestions={suggestions} loading={suggestionsLoading} onPick={pick} />
        ) : (
          <>
            {favorites.length > 0 && (
              <section className="mt-4">
                <h3 className="text-[12px] text-white/60">收藏的城市（{favorites.length}）</h3>
                <ul className="mt-2 space-y-1.5">
                  {favorites.map((city) => (
                    <li
                      key={city.id}
                      className={`flex items-center gap-1 rounded-xl pl-3 pr-1.5 ${
                        city.id === activeId ? 'bg-white/25' : 'bg-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onSelectFavorite(city)}
                        className="flex-1 truncate py-2 text-left text-[15px] disabled:opacity-40"
                      >
                        {city.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(city.id)}
                        aria-label={`删除收藏 ${city.name}`}
                        className="rounded-full p-1.5 text-white/55 transition hover:bg-white/20 hover:text-white"
                      >
                        <WeatherIcon name="close" className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-4">
              <h3 className="text-[12px] text-white/60">快捷城市</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOT_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    disabled={loading}
                    onClick={() => pick(city)}
                    className="rounded-full bg-white/15 px-3 py-1 text-[13px] transition hover:bg-white/25 disabled:opacity-40"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </form>

      {/* 点空白处关闭 */}
      <button type="button" aria-label="关闭搜索" onClick={onClose} className="flex-1" />
    </div>
  );
}
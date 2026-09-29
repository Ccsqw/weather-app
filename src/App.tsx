import { useEffect, useRef, useState } from 'react';
import { byCity, locationCacheKey, type LocationQuery } from './api/location';
import { BackgroundLayer } from './components/BackgroundLayer';
import { FavoriteButton } from './components/FavoriteButton';
import { PageIndicator } from './components/PageIndicator';
import { PhoneFrame } from './components/PhoneFrame';
import { Screen } from './components/Screen';
import { SearchPanel } from './components/SearchPanel';
import { WeatherIcon } from './components/WeatherIcon';
import { DetailPage } from './components/pages/DetailPage';
import { ForecastPage } from './components/pages/ForecastPage';
import { NowPage } from './components/pages/NowPage';
import { useBackgroundPreference, useCityBackground } from './hooks/useCityBackground';
import { useCitySuggestions } from './hooks/useCitySuggestions';
import { useFavorites } from './hooks/useFavorites';
import { usePageSwiper } from './hooks/usePageSwiper';
import { useWeather } from './hooks/useWeather';
import { resolveWeatherTheme, type WeatherTheme } from './utils/weatherTheme';
import type { FavoriteCity } from './utils/favorites';

const INITIAL_QUERY = byCity('上海市');
const PAGE_COUNT = 3;

export default function App() {
  const [query, setQuery] = useState<LocationQuery>(INITIAL_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  /** 正在查询的城市名，null 表示当前这次加载不是搜索触发的 */
  const [pendingCity, setPendingCity] = useState<string | null>(null);
  const lastOkQuery = useRef<LocationQuery>(INITIAL_QUERY);

  const { favorites, isFavorite, toggle, remove } = useFavorites();
  const { suggestions, loading: suggestionsLoading } = useCitySuggestions(searchKeyword, favorites);
  const { enabled: photoEnabled, toggle: togglePhoto } = useBackgroundPreference();
  const { image: backgroundImage } = useCityBackground(query, photoEnabled);
  const { status, data, message, code, reload } = useWeather(query, { days: 7 });
  // 没拿到数据时先用晴天主题（也是原设计稿的配色），拿到后按天气 + 昼夜切换
  const weatherTheme: WeatherTheme = data ? resolveWeatherTheme(data.current) : 'day-clear';
  // 城市变了就换 key，触发内容入场动画
  const cityKey = data ? `${data.location.cityId}|${data.location.city}` : '';
  const switching = status === 'loading' && Boolean(data);
  const { ref, index, dragging, onScroll, goTo, onKeyDown, onPointerDown, onPointerMove, onPointerUp } =
    usePageSwiper(PAGE_COUNT);

  const currentId = locationCacheKey(query);
  const starred = isFavorite(query);

  // 记住最近一次查成功的城市，搜索失败时好退回去
  useEffect(() => {
    if (status === 'ok') lastOkQuery.current = query;
  }, [status, query]);

  // 查询成功 -> 自动收起搜索面板
  useEffect(() => {
    if (pendingCity !== null && status === 'ok') {
      setPendingCity(null);
      setSearchOpen(false);
    }
  }, [pendingCity, status]);

  const goToCity = (target: LocationQuery, label: string) => {
    setPendingCity(label);
    setQuery(target);
    goTo(0); // 回到实时天气页
  };

  const openSearch = () => {
    setPendingCity(null);
    setSearchKeyword('');
    // 上次是失败态的话，先退回上一个成功的城市，避免关掉面板后卡在错误页
    if (status === 'error' && locationCacheKey(query) !== locationCacheKey(lastOkQuery.current)) {
      setQuery(lastOkQuery.current);
    }
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchKeyword('');
    if (pendingCity !== null && status === 'error') {
      setPendingCity(null);
      setQuery(lastOkQuery.current);
    }
  };

  const selectFavorite = (favorite: FavoriteCity) => {
    setSearchOpen(false);
    setPendingCity(null);
    setQuery(favorite.query);
    goTo(0);
  };

  const searchError = pendingCity !== null && status === 'error' ? message : undefined;

  return (
    <PhoneFrame>
      <div className="relative h-full w-full overflow-hidden text-white">
        <BackgroundLayer image={backgroundImage} theme={weatherTheme} />
        {status === 'loading' && !data && <LoadingScreen />}
        {status === 'error' && <ErrorScreen message={message} code={code} onRetry={reload} />}

        {data && (
          <>
            <div
              ref={ref}
              onScroll={onScroll}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDragStart={(event) => event.preventDefault()}
              tabIndex={0}
              role="group"
              aria-label="天气信息，左右滑动或按住鼠标拖动切换"
              className={`no-scrollbar relative z-10 flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden transition-opacity duration-300 ${
                dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
              } ${switching ? 'opacity-55' : 'opacity-100'}`}
            >
              <Screen>
                <div key={`now-${cityKey}`} className="content-enter h-full">
                  <NowPage city={data.location.city} current={data.current} />
                </div>
              </Screen>
              <Screen scrollable>
                <div key={`forecast-${cityKey}`} className="content-enter">
                  <ForecastPage rain={data.rain} hourly={data.hourly} daily={data.daily} />
                </div>
              </Screen>
              <Screen scrollable>
                <div key={`detail-${cityKey}`} className="content-enter">
                  <DetailPage current={data.current} />
                </div>
              </Screen>
            </div>

            <PageIndicator count={PAGE_COUNT} active={index} onSelect={goTo} />
          </>
        )}

        {!searchOpen && (
          <button
            type="button"
            onClick={togglePhoto}
            aria-pressed={photoEnabled}
            aria-label={photoEnabled ? '关闭城市照片背景' : '开启城市照片背景'}
            title={photoEnabled ? '关闭城市照片背景' : '开启城市照片背景'}
            className={`absolute left-3 top-4 z-20 rounded-full p-2 backdrop-blur-card transition ${
              photoEnabled ? 'bg-white/85 text-sky-from' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <WeatherIcon name="photo" className="h-5 w-5" />
          </button>
        )}

        {!searchOpen && (
          <div className="absolute right-3 top-4 z-20 flex items-center gap-2">
            <FavoriteButton
              active={starred}
              disabled={!data}
              onToggle={() => {
                if (data) toggle(query, data.location.city);
              }}
            />
            <button
              type="button"
              onClick={openSearch}
              aria-label="搜索城市"
              className="rounded-full bg-white/15 p-2 text-white backdrop-blur-card transition hover:bg-white/25"
            >
              <WeatherIcon name="search" className="h-5 w-5" />
            </button>
          </div>
        )}

        <SearchPanel
          open={searchOpen}
          loading={pendingCity !== null && status === 'loading'}
          error={searchError}
          keyword={searchKeyword}
          onKeywordChange={setSearchKeyword}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          favorites={favorites}
          activeId={currentId}
          onSearch={(city) => goToCity(byCity(city), city)}
          onSelectFavorite={selectFavorite}
          onRemoveFavorite={remove}
          onClose={closeSearch}
        />
      </div>
    </PhoneFrame>
  );
}

function LoadingScreen() {
  return (
    <div className="h-full px-4 pt-14">
      <div className="mx-auto h-8 w-28 animate-pulse rounded-lg bg-white/20" />
      <div className="mx-auto mt-3 h-4 w-16 animate-pulse rounded bg-white/15" />
      <div className="mx-auto mt-24 h-[76px] w-40 animate-pulse rounded-2xl bg-white/15" />
      <div className="mx-auto mt-5 h-4 w-44 animate-pulse rounded bg-white/15" />
      <div className="mt-20 h-14 animate-pulse rounded-xl bg-white/15" />
    </div>
  );
}

function ErrorScreen({
  message,
  code,
  onRetry,
}: {
  message?: string;
  code?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="text-[15px] leading-relaxed">{message ?? '天气数据获取失败'}</p>
      {code && <p className="mt-2 text-[13px] text-white/60">错误类型：{code}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-white px-5 py-2 text-[14px] text-sky-from"
      >
        重新加载
      </button>
    </div>
  );
}

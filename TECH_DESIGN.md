# 天气 Web App 技术文档

对应 PRD：`./PDR.md` ｜ 参考图：`./reference.png`

---

## 1. 技术栈

| 层 | 选型 |
| --- | --- |
| 构建 | Vite 5 |
| 框架 | React 18 + TypeScript 5 |
| 样式 | Tailwind CSS 3 |
| 数据 | fetch 调用天气 API（带 mock 降级开关） |
| 图标 | 自建内联 SVG 组件，不引入图标库 |
| 环境 | Node 18+ |

```
dependencies:  react, react-dom
devDependencies: vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom,
                 tailwindcss, postcss, autoprefixer
```

---

## 2. 目录结构

```
weather-app/
|-- index.html
|-- package.json
|-- vite.config.ts
|-- tailwind.config.js
|-- postcss.config.js
|-- tsconfig.json
|-- .env.example                 # provider / base url / key / mock 开关 / 超时
+-- src/
    |-- main.tsx
    |-- App.tsx                  # 三屏装配 + 加载/错误态
    |-- index.css                # Tailwind 入口 + CSS 变量 + 全局样式
    |-- types/weather.ts         # 数据模型（唯一数据契约）
    |-- api/
    |   |-- config.ts            # 环境变量与 provider 选择
    |   |-- error.ts             # ApiError + 文案映射
    |   |-- client.ts            # fetch 封装：超时、鉴权、错误统一处理
    |   |-- location.ts          # LocationQuery、坐标校验、地点缓存
    |   |-- weather.ts           # 业务编排：getCurrentWeather / getForecast / getWeather
    |   |-- mock.ts              # 本地 mock 数据
    |   +-- providers/
    |       |-- types.ts         # WeatherProvider 接口
    |       |-- index.ts         # 按环境变量选择 provider
    |       |-- shared.ts        # 共用字段处理
    |       |-- qweather.ts + qweather.normalize.ts
    |       +-- openweather.ts + openweather.normalize.ts
    |-- hooks/
    |   |-- useWeather.ts        # 请求状态：loading / ok / error
    |   +-- usePageSwiper.ts     # 横滑 + 页码联动
    |-- components/
    |   |-- PhoneFrame.tsx       # 桌面端手机画框
    |   |-- Screen.tsx           # 单屏容器
    |   |-- Card.tsx             # 通用毛玻璃卡片
    |   |-- PageIndicator.tsx    # 底部 3 个圆点
    |   |-- WeatherIcon.tsx      # 图标 name -> SVG
    |   |-- pages/NowPage.tsx
    |   |-- pages/ForecastPage.tsx
    |   |-- pages/DetailPage.tsx
    |   +-- cards/
    |       |-- RainCard.tsx
    |       |-- HourlyCard.tsx
    |       |-- DailyCard.tsx
    |       |-- TempRangeBar.tsx
    |       +-- DetailGrid.tsx
    +-- utils/format.ts          # 温度、时间格式化
```
---

## 3. 数据模型（`src/types/weather.ts`）

所有组件只依赖这里的类型，不接触接口原始字段。

```ts
export type WeatherIcon =
  | 'sunny' | 'cloudy' | 'overcast' | 'rain'
  | 'snow' | 'thunder' | 'fog' | 'sunset' | 'sunrise';

export type AqiLevel = '优' | '良' | '轻度污染' | '中度污染' | '重度污染' | '严重污染';

export interface CurrentWeather {
  temp: number;
  condition: string;
  icon: WeatherIcon;
  tempMax: number;
  tempMin: number;
  aqi: number;
  aqiLevel: AqiLevel;
  aqiAdvice: string;
  humidity: number;
  dewPoint: number;
  feelsLike: number;
  windScale: number;
  windDir: string;
  uvIndex: number;
  visibility: number;
  sunrise: string;   // HH:mm
  sunset: string;    // HH:mm
}

export interface HourlyItem { time: string; label: string; temp: number; icon: WeatherIcon; }
export interface DailyItem  { day: string; icon: WeatherIcon; tempMin: number; tempMax: number; }

export interface WeatherData {
  location: { city: string; cityId: string };
  current: CurrentWeather;
  rain: { summary: string; hasRain: boolean };
  hourly: HourlyItem[];
  daily: DailyItem[];
}
```

---

## 4. 数据层

### 4.1 请求入口（`src/api/weather.ts` + `src/api/providers/`）

数据源差异全部收敛在 provider 内，`weather.ts` 只负责编排与合并：

```ts
// src/api/providers/types.ts
export interface WeatherProvider {
  id: ProviderId;
  label: string;
  resolveLocation(query: LocationQuery, signal?: AbortSignal): Promise<ResolvedLocation>;
  fetchWeather(location: ResolvedLocation, options: FetchOptions): Promise<ProviderWeather>;
}
```

```ts
// src/api/weather.ts  对外只暴露这三个
export async function getCurrentWeather(query, options);  // { location, current }
export async function getForecast(query, options);        // { location, hourly, daily }
export async function getWeather(query, options);         // WeatherData（合并）
```

- 走哪个数据源由 `VITE_WEATHER_PROVIDER` 决定：`qweather`（默认）或 `openweathermap`
- 城市名先经地理编码换成数据源需要的形式（和风天气是 LocationID，OWM 是经纬度），结果内存缓存
- 新增数据源只需实现一个 provider，视图层与 `weather.ts` 都不用改
- 详细的接口对照与单位换算见 README 的「切换数据源」一节
### 4.2 环境变量（`.env.example`）

```
VITE_API_BASE=https://devapi.qweather.com
VITE_USE_MOCK=true
```

- `.env.local` 放真实密钥，加入 `.gitignore`，前端不落库
- 生产环境建议经自建后端代理调用三方 API，避免密钥暴露在浏览器

### 4.3 归一化（`src/api/providers/*.normalize.ts`）

把三方返回（和风天气 / OpenWeatherMap 等）映射为 `WeatherData`：

```ts
export function normalize(raw: any): WeatherData {
  return {
    location: { city: raw.location?.name ?? '--', cityId: raw.location?.id ?? '' },
    current: {
      temp: Math.round(raw.now?.temp ?? NaN),
      condition: raw.now?.text ?? '--',
      icon: mapIcon(raw.now?.icon),          // 三方 icon code → 本地枚举
      // ...其余字段同理
    },
    rain: { summary: '未来 2 小时内无降水。', hasRain: false },
    hourly: (raw.hourly ?? []).slice(0, 24).map(toHourlyItem),
    daily: (raw.daily ?? []).slice(0, 10).map(toDailyItem),
  };
}
```

字段缺失时返回 `NaN` / `'--'`，由 UI 层降级显示，不抛错。

### 4.4 请求状态 Hook（`src/hooks/useWeather.ts`）

```ts
export function useWeather(cityId = '101020100') {
  const [state, setState] = useState<{
    status: 'loading' | 'ok' | 'error';
    data?: WeatherData;
  }>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    getWeather(cityId)
      .then(data => setState({ status: 'ok', data }))
      .catch(() => setState({ status: 'error' }));
  }, [cityId]);

  useEffect(load, [load]);

  return { ...state, reload: load };
}
```

`App.tsx` 中调用一次，按 `status` 渲染骨架屏 / 正常内容 / 错误重试。

---

## 5. 组件设计

| 组件 | 职责 | 主要 props |
| --- | --- | --- |
| `Screen` | 单屏容器，负责高度、内边距、纵向滚动 | `children` |
| `Card` | 毛玻璃卡片外壳 | `className`, `children` |
| `PageIndicator` | 底部圆点，点击切页 | `count`, `active`, `onSelect` |
| `WeatherIcon` | `name` → 内联 SVG | `name: WeatherIcon`, `size` |
| `NowPage` | 第 1 屏 | `current`, `city` |
| `ForecastPage` | 第 2 屏容器 | `rain`, `hourly`, `daily` |
| `DetailPage` | 第 3 屏容器 | `current` |
| `RainCard` | 降雨预报卡 | `summary`, `hasRain` |
| `HourlyCard` | 逐小时，横向 5 列 | `items` |
| `DailyCard` | 10 天预报列表 | `items` |
| `TempRangeBar` | 温度区间条 | `min`, `max`, `dayMin`, `dayMax` |
| `DetailGrid` | 2 列 × 3 行指标网格 | `current` |

缺数据约定：`hourly` 为空则整卡不渲染；单个数值为 `NaN` 时显示 `--°`。

---

## 6. 样式方案

### 6.1 Tailwind 扩展（`tailwind.config.js`）

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sky-from': '#4E9FE6',
        'sky-to':   '#6FB8F0',
        'good':     '#34C759',
      },
      fontSize: {
        temp:  ['96px', { lineHeight: '1', fontWeight: '200' }],
        city:  ['34px', { lineHeight: '1.2', fontWeight: '600' }],
        metric:['30px', { lineHeight: '1.2' }],
      },
      borderRadius: { card: '16px' },
      backdropBlur: { card: '20px' },
    },
  },
};
```

### 6.2 常用类组合

| 用途 | 类 |
| --- | --- |
| 页面背景 | `bg-gradient-to-b from-sky-from to-sky-to text-white` |
| 卡片 | `rounded-card bg-white/15 backdrop-blur-card p-4` |
| 主 / 次文字 | `text-white` / `text-white/75` |
| 大温度 | `text-temp tabular-nums` |
| 页面留白 | `px-4`（16px） |
| 卡片间距 | `gap-3`（12px） |

### 6.3 全局样式（`index.css`）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  overscroll-behavior: none;   /* 关掉橡皮筋，避免误触发 */
}
```

---

## 7. 关键实现

### 7.1 横滑分页 + 圆点联动（`usePageSwiper`）

用原生 `scroll-snap` 实现，不引第三方轮播库。

```tsx
// 容器
<div
  ref={ref}
  onScroll={onScroll}
  className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth
             [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
>
  {pages.map((p, i) => (
    <section key={i} className="h-full w-full shrink-0 snap-start">{p}</section>
  ))}
</div>
```

```ts
export function usePageSwiper(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return { ref, index, onScroll, goTo };
}
```

要点：
- 每屏 `w-full shrink-0`，容器 `snap-mandatory`，天然实现左右边界回弹不越界
- 圆点：`goTo(i)`；滚动时用 `onScroll` 反查当前页（不要用 `IntersectionObserver` 监听，滚动过程中会抖动）
- 每屏内部用 `overflow-y-auto`，纵向滚动与横向翻页互不干扰
- 桌面端鼠标拖拽可选：按住左键时把 `mousemove` 位移映射到 `scrollLeft`

### 7.2 温度区间条（`TempRangeBar`）

区间位置按当天温度在 10 天总温区间中的占比计算：

```tsx
export function TempRangeBar({ min, max, dayMin, dayMax }: Props) {
  const span = Math.max(max - min, 1);
  const left = ((dayMin - min) / span) * 100;
  const width = Math.max(((dayMax - dayMin) / span) * 100, 8); // 最小可见宽度 8%

  return (
    <div className="relative h-1 flex-1 rounded-full bg-white/25">
      <div
        className="absolute h-full rounded-full"
        style={{ left: `${left}%`, width: `${width}%`,
                 background: 'linear-gradient(90deg,#6FD8F5,#FFD84D)' }}
      />
    </div>
  );
}
```

父组件先算总区间：

```ts
const min = Math.min(...daily.map(d => d.tempMin));
const max = Math.max(...daily.map(d => d.tempMax));
```

### 7.3 毛玻璃降级

部分低端安卓机不支持 `backdrop-filter`。用 Tailwind 的 `supports-*` 变体：

```css
/* index.css */
@supports not (backdrop-filter: blur(1px)) {
  .card { background-color: rgb(255 255 255 / 0.22); }
}
```

或直接在 `Card` 组件里 `className="bg-white/15 supports-[not(backdrop-filter:blur(1px))]:bg-white/25"`。

### 7.4 移动端适配

- 高度用 `h-[100dvh]`，避免地址栏收起导致的跳动
- 页面底部 `pb-[max(1rem,env(safe-area-inset-bottom))]` 适配 Home Indicator
- `index.html` 里加 `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />`
- 桌面端（>= 1024px）：外层容器 `mx-auto max-w-[420px] h-[812px] rounded-[40px] overflow-hidden`，模拟手机画框

---

## 8. 运行方式

```bash
npm install
cp .env.example .env.local     # 按需改 VITE_USE_MOCK
npm run dev                    # http://localhost:5173
npm run build && npm run preview
```

---

## 9. 开发顺序

1. Vite + TS + Tailwind 脚手架，跑通空页面
2. 写 `types/weather.ts` + `api/mock.ts`（照 PRD 的示例数据填）
3. `App.tsx` 三屏骨架 + `usePageSwiper` + `PageIndicator`，先验证切页
4. 第 1 屏 `NowPage`（大温度、温度范围、AQI 胶囊）
5. 第 2 屏三张卡片，重点调 `TempRangeBar`
6. 第 3 屏 `DetailGrid`
7. 接 `getWeather` + `useWeather`，补骨架屏与错误重试
8. 桌面端手机画框 + 与参考图逐项比对微调

---

## 10. 自查清单

- [ ] 组件里没有直接出现接口原始字段，全部走 `WeatherData`
- [ ] `VITE_USE_MOCK=false` 时能正常请求并渲染，接口报错显示重试
- [ ] 三屏任意一屏内容超长时，纵向滚动不影响横向翻页
- [ ] 圆点数量与页数一致，点击 / 滑动后状态同步
- [ ] 温度区间条长度随温度变化，最小宽度可见
- [ ] iOS Safari 与 Android Chrome 上背景模糊、安全区正常
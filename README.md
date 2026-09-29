# 天气 Web App

对应文档：[PDR.md](./PDR.md) ｜ [TECH_DESIGN.md](./TECH_DESIGN.md) ｜ 参考图：`reference.png`

## 当前进度

- [x] 工程脚手架：Vite + React + TypeScript + Tailwind
- [x] 三屏界面：实时天气 / 预报 / 详细数据
- [x] 横滑分页、圆点联动、键盘方向键
- [x] 加载骨架屏、错误重试、缺数据降级
- [x] 数据层多数据源：和风天气 QWeather / OpenWeatherMap One Call
- [x] 城市名（地理编码）与经纬度两种查询方式
- [x] 城市搜索：输入城市名查询、加载动画、失败友好提示
- [x] 城市收藏：LocalStorage 持久化、点击快速查询、可删除
- [x] 搜索联想：输入第一个字即出候选（本地城市库 + 收藏 + 接口联想）
- [x] 图标改为仿 iOS 天气（天气类彩色实心、工具类描边）
- [x] 鼠标拖拽切页
- [x] 仿手机外壳：机身金属渐变、屏幕内缩黑边、灵动岛、Home 指示条、侧键
- [x] 天气渐变主题：未开照片时背景按「天气 + 昼夜」自动换色
- [x] 切换城市动画：内容淡入上浮、旧内容变暗、大温度数字滚动
- [x] 城市照片背景：Wikimedia Commons 按坐标找图，同城同日固定一张，默认关闭可开关
- [ ] 接入真实 Key 联调
- [ ] 图标细节打磨与逐像素比对

## 快速开始

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
```

默认使用本地 mock 数据（`.env.local` 中 `VITE_USE_MOCK=true`），**不需要 API Key 就能跑**。

## 切换数据源

`src/api/weather.ts` 对外只暴露三个函数，数据源差异全部收敛在 `src/api/providers/` 下，切换只改一个环境变量：

```bash
VITE_WEATHER_PROVIDER=qweather        # 和风天气（默认）
VITE_WEATHER_PROVIDER=openweathermap  # OpenWeatherMap
```

| | 和风天气 QWeather | OpenWeatherMap |
| --- | --- | --- |
| 实时天气 | `/v7/weather/now` | `/data/4.0/onecall` 的 `current` |
| 逐小时 | `/v7/weather/24h` | 同一个 One Call 的 `hourly` |
| 逐天 | `/v7/weather/3d`、`/v7/weather/7d` | 同一个 One Call 的 `daily` |
| 空气质量 | `/v7/air/now` | `/data/2.5/air_pollution` |
| 城市名 -> 坐标/ID | `/v2/city/lookup`（GeoAPI 域名） | `/geo/1.0/direct` |
| 鉴权 | query `key` + header `X-QW-Api-Key` | query `appid` |
| 请求次数 | 4 次并发（空气质量失败可降级） | 1 次 One Call + 1 次空气质量 |

### OpenWeatherMap 的两种接口

| | One Call（4.0 / 3.0） | 免费版 2.5 |
| --- | --- | --- |
| 适用 Key | 需单独订阅 One Call | **普通免费 Key 即可** |
| 接口 | `/data/4.0/onecall` | `/data/2.5/weather` + `/data/2.5/forecast` |
| 逐小时 | 1 小时粒度，48 条 | 3 小时粒度，40 条（5 天） |
| 逐天 | 8 天 | 由 3 小时数据按自然日归并 |
| 紫外线 | 有（`current.uvi`） | 无（显示 `--`） |
| 露点 | 有 | 由气温 + 湿度按 Magnus 公式算出 |

`VITE_OPENWEATHER_API_MODE` 控制用哪套：

- `auto`（默认）：先按 One Call 走，遇到 401/403 自动切到免费版并在控制台给一次告警，同一会话内不再重试
- `onecall`：强制 One Call，失败直接报错
- `free`：直接用免费版，省掉一次注定失败的请求

One Call 版本路径在 `src/api/providers/openweather.ts` 的 `ONECALL_PATH`，改成 `/data/3.0/onecall` 即可切到 3.0。

> 免费版给的是 120 小时窗口，按自然日切会跨 6 个自然日：首尾两天只有半天数据，所以「今天」那行的温度区间会比实际窄一些；逐小时也是 3 小时一格（现在 / 15时 / 18时）。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_WEATHER_PROVIDER` | `qweather`（默认）/ `openweathermap` |
| `VITE_USE_MOCK` | `true` / `1` / `yes` / `on` 时使用本地 mock，不发网络请求 |
| `VITE_REQUEST_TIMEOUT` | 单次请求超时，默认 8000ms |
| `VITE_WEATHER_API_BASE_URL` | 和风天气 API Host |
| `VITE_WEATHER_GEO_BASE_URL` | 和风天气 GeoAPI Host |
| `VITE_WEATHER_API_KEY` | 和风天气 Key |
| `VITE_OPENWEATHER_API_BASE_URL` | OWM 域名，默认 `https://api.openweathermap.org` |
| `VITE_OPENWEATHER_API_KEY` | OWM Key |
| `VITE_OPENWEATHER_UNITS` | 默认 `metric`（摄氏度 + 米/秒） |
| `VITE_OPENWEATHER_LANG` | 默认 `zh_cn`，让接口直接返回中文天气描述 |
| `VITE_OPENWEATHER_API_MODE` | `auto`（默认，One Call 不可用时自动降级）/ `onecall` / `free` |

> 密钥会打进前端产物，仅适合本地开发。生产环境建议用 Vite 代理或自建后端转发（见 `vite.config.ts` 注释）。

## 数据层用法

```ts
import { getCurrentWeather, getForecast, getWeather } from './api/weather';
import { byCity, byCoords } from './api/location';

// 按城市名
await getCurrentWeather(byCity('上海市'));
// 按经纬度（纬度, 经度）
await getForecast(byCoords(31.2304, 121.4737), { days: 7 });
// 页面直接消费的合并结果
await getWeather(byCity('北京市'), { days: 3 });
```

| 函数 | 返回 |
| --- | --- |
| `getCurrentWeather(query)` | `{ location, current }` |
| `getForecast(query, { days })` | `{ location, hourly, daily }` |
| `getWeather(query, { days })` | `WeatherData`：合并结果，并把当日最高最低温、日出日落补进 `current` |

另有 `getWeatherByCity(city, adm?, options)` / `getWeatherByCoords(lat, lon, options)` 两个快捷入口。

`query` 由 `byCity(city, adm?)` 或 `byCoords(lat, lon)` 生成。城市名会先经地理编码换成数据源需要的形式（和风天气是 LocationID，OWM 是经纬度），同一查询结果在内存中缓存，不会重复查。

## 错误处理

网络层异常统一收敛为 `ApiError`（`src/api/error.ts`）：

| code | 含义 |
| --- | --- |
| `CONFIG` | 缺 API Key、经纬度越界、城市名为空 |
| `TIMEOUT` | 超过 `VITE_REQUEST_TIMEOUT` |
| `NETWORK` | 网络不可达 / 域名解析失败 |
| `HTTP` | 非 2xx 响应（如 401 Key 无效） |
| `PROVIDER` | 业务错误码（如和风天气 403 未订阅） |
| `PARSE` | 响应不是合法 JSON |
| `NOT_FOUND` | 城市搜索无结果 |

```ts
import { ApiError, toUserMessage } from './api/error';

try {
  const data = await getWeather(byCity('上海市'));
} catch (error) {
  if (ApiError.is(error)) console.warn(error.code, error.providerCode, error.status);
  alert(toUserMessage(error));
}
```

- 取消请求：传入 `{ signal }`，取消时抛原生 `AbortError`，不会被包装成 `ApiError`
- 空气质量接口失败（未订阅 / 无权限）会自动降级，不影响主流程
- 单个字段缺失一律降级为 `null`，UI 用 `--` 展示，不会出现 `NaN`

## 配置排查

启动时 `main.tsx` 会调用 `inspectConfig()` 做一次自检，配置有问题直接打在控制台：

```
[配置] VITE_USE_MOCK 的值「flase」无法识别，请填 true 或 false（当前按 false 处理）
[配置] 当前数据源是和风天气，但没有读到 VITE_WEATHER_API_KEY。请在 .env.local 填写后重启 dev server，或把 VITE_USE_MOCK 设为 true 使用本地数据。 检测到 VITE_OPENWEATHER_API_KEY 已经填了值，如果你本来想用 OpenWeatherMap，把 VITE_WEATHER_PROVIDER 改成 openweathermap
[配置] 数据源：OpenWeatherMap，数据模式：在线接口
```

常见坑：

| 现象 | 原因 |
| --- | --- |
| 报「缺少 X 的 API Key」但明明填了 | **Key 填到了另一个数据源的变量上**。对应关系：`qweather` 用 `VITE_WEATHER_API_KEY`，`openweathermap` 用 `VITE_OPENWEATHER_API_KEY`，必须和 `VITE_WEATHER_PROVIDER` 一致 |
| 改了 `.env` 不生效 | Vite 只在启动时读 env，**改完必须重启 `npm run dev`** |
| `VITE_USE_MOCK=flase` | 拼写错误。只有 `true` / `1` / `yes` / `on` 算开启，`false` / `0` / `no` / `off` 算关闭，其它值按 false 处理并在控制台报错（不会再被静默吞掉） |

> OpenWeatherMap 的 One Call（3.0 / 4.0）是单独的订阅产品，普通免费 Key 调它一律 401。默认的 `auto` 模式会自动降级到免费接口，不用手动处理；想用 1 小时粒度数据和紫外线，去控制台订阅 One Call 后把 `VITE_OPENWEATHER_API_MODE` 设为 `onecall`。
## 城市搜索

右上角放大镜打开搜索面板，输入城市名后点「搜索」（或回车）即可查询，下方还有快捷城市可以直接点。

交互约定：

| 状态 | 表现 |
| --- | --- |
| 查询中 | 面板内转圈动画 + 「正在查询「北京市」」，按钮变「查询中」并禁用；主界面保留上一次的数据，不会闪骨架屏 |
| 查询成功 | 面板自动收起，并自动回到第 1 屏 |
| 查询失败 | 提示留在面板内，可原地改名重试；关掉面板时页面会退回上一个查询成功的城市，不会卡在错误页 |

失败文案由 `toUserMessage()` 统一生成，例如找不到城市时是：

```
找不到该城市：「不存在的城市」，请检查名称是否正确
```

涉及的文件：

| 文件 | 职责 |
| --- | --- |
| `src/components/SearchPanel.tsx` | 搜索面板：输入框、搜索按钮、加载动画、失败提示、快捷城市 |
| `src/App.tsx` | 持有 `query` 状态；`pendingCity` 区分「本次加载是否由搜索触发」；失败时回退到 `lastOkQuery` |
| `src/hooks/useWeather.ts` | 重新加载时保留上一次数据，避免切换城市时闪骨架屏 |
## 搜索联想

输入第一个字就会出现候选，来源有三层：

| 来源 | 说明 |
| --- | --- |
| 收藏 | 匹配的收藏城市排最前，右侧带星标 |
| 本地城市库 | `src/data/cities.ts`，104 条（省会 / 直辖市 / 计划单列市 / 主要城市）。支持**中文前缀**与**拼音前缀**（`hang` 也能搜到杭州市），完全离线、零延迟 |
| 接口联想 | 本地结果不足 8 条时，防抖 250ms 调数据源的地理编码接口补充（和风天气 `/v2/city/lookup`、OWM `/geo/1.0/direct`） |

排序：名称前缀 4 分 > 拼音前缀 3 分 > 名称包含 2 分 > 拼音包含 1 分，收藏额外加 100 分；同名去重，最多 8 条。

两个兜底：接口联想失败会被**静默忽略**（不影响手输搜索）；本地也匹配不到时提示「没有匹配的城市，直接点搜索按输入的名称查」。

| 文件 | 职责 |
| --- | --- |
| `src/data/cities.ts` | 内置城市库（名称 + 拼音 + 省份） |
| `src/utils/citySuggest.ts` | 纯函数：打分排序、收藏优先、去重、本地与接口结果合并 |
| `src/hooks/useCitySuggestions.ts` | 本地结果同步出，接口结果防抖补充 |
| `src/components/SuggestionList.tsx` | 联想列表（城市名 + 省份 + 收藏星标） |

## 图标

自绘内联 SVG（`src/components/WeatherIcon.tsx`），仿 iOS 天气：

- **天气类用彩色实心块面**：太阳黄 `#FFD60A`、雨滴蓝 `#5AC8FA`、云与雪白、月亮浅灰  **颜色本身就是信息**，不看文字也能认出是什么天气
- **工具类用白色描边**（对应 SF Symbols 的 `magnifyingglass` / `clock` / `calendar` / `wind`），线宽统一 1.9、圆头圆角
- `tone="mono"` 可强制单色；详细数据卡的 6 个图标走 mono，和 iOS 一致（那里是统一白色）
- 统一 24 网格；云朵用「两个圆 + 一个圆角矩形求并集」构造  同色实心图形叠合不露接缝，轮廓平滑，不依赖手调贝塞尔曲线

形态上刻意拉开区分度，避免"都是白线看不懂"：

| 图标 | 形态 |
| --- | --- |
| 晴 / 夜间 | 黄色实心太阳 + 八道光线 / 浅灰月牙 |
| 晴间多云 | 云后面露出黄色太阳 |
| 阴 | 只有一朵云（不再用半透明叠加，小尺寸会发灰） |
| 雨 / 雪 | 云 + 三条蓝色斜线 / 云 + 六角雪花（形状完全不同） |
| 雷 / 雾 | 云 + 黄色闪电 / 云 + 两条白色横线 |
| 日出 / 日落 | 半圆 + 地平线 + **向上散开的光线** / **向下的箭头** |

看实际效果：浏览器打开 `icons-preview.html`（20 个图标  16/24/40/64px，附 mono 色调，以及每小时预报 / 10 天预报 / 详细数据三种真实上下文里的实物尺寸）。

## 页面切换

| 方式 | 说明 |
| --- | --- |
| 触摸滑动 | 交给浏览器原生滚动，惯性与回弹都是系统的 |
| **鼠标拖拽** | Pointer Events 手动接管（只有 `pointerType === 'mouse'` 才介入，不影响触摸），按住左右拖动跟手，松手吸附到最近一页 |
| 点击圆点 / 键盘  | 平滑滚动到目标页 |

鼠标拖拽的两个关键点：

1. **拖拽期间临时关掉 `scroll-snap`**（`element.style.scrollSnapType = 'none'`，直接改 DOM 不等 React 渲染）。否则每次改 `scrollLeft` 都会被强制吸附回去，根本拖不动。
2. **松手后等吸附动画走完（340ms）再恢复**，中途恢复会把平滑动画打断成瞬移。

其余细节：位移小于 4px 视为点击不触发切页；`setPointerCapture` 保证鼠标拖出容器也能继续跟随；拖拽时切成 `cursor-grabbing` 并禁用文字选中。

## 切换城市动画

切城市时不再是硬切，三层动画配合：

| 动画 | 时长 | 做法 |
| --- | --- | --- |
| 大温度数字滚动 | 620ms | `useAnimatedNumber`，easeOutCubic 补间；**首帧直接给目标值**，所以首屏不会从 0 滚上来 |
| 内容淡入上浮 | 460ms | 内容外层挂 `key={cityId\|cityName}`，城市一变就重挂载并播 `contentIn`（`opacity 01` + `translateY(10px)0` + `scale(0.992)1`） |
| 旧内容变暗 | 300ms | 加载新城市的这段时间里（`status === 'loading' && 已有数据`），把滚动容器降到 `opacity-55` |

背景渐变本身的淡入是独立的一层（`themeFade 700ms`），和上面三层并行，所以颜色和内容是一起过渡的。

三个实现细节：

1. **不重挂载滚动容器**。动画挂到每屏的内容外层而不是分页容器上重挂载分页容器会把 `scrollLeft` 重置，但 `usePageSwiper` 的 `index` 状态不会跟着重置，页码圆点就会和实际页面对不上。
2. **动画用普通 CSS 写死**（`index.css` 里的 `.content-enter`），不走 Tailwind 任意值，避免 `cubic-bezier(0.22, 1, 0.36, 1)` 里的括号逗号被解析器误伤。
3. **尊重 `prefers-reduced-motion`**：系统开了「减少动态效果」时，全局把动画与过渡压到 0.01ms。
## 天气渐变主题

没开城市照片时，背景不再是固定蓝色，而是按「天气 + 昼夜」自动换色（`src/utils/weatherTheme.ts`，纯函数）。

| 主题 | 触发条件 | 配色 |
| --- | --- | --- |
| `day-clear` | 晴 + 白天 | `#4E9FE6  #6FB8F0`（与原设计稿完全一致） |
| `day-cloudy` | 多云 + 白天 | `#4A90CF  #6FA8D8`（保留蓝感，略灰） |
| `overcast` | 阴 | `#5C6B7A  #8C99A6` |
| `rain` / `thunder` / `snow` / `fog` | 对应天气，不分昼夜 | 深灰蓝 / 深紫灰 / 冷灰白 / 中性灰 |
| `golden` | 日出日落前后 40 分钟 | `#D96A4A  #7A5CA8` |
| `night-clear` / `night-cloudy` | 夜间或 `night` 图标 | `#0A1730  #1E3A63` / `#152238  #2C4260` |

判定顺序：

1. **降水 / 雾霾类**先按天气定（跟昼夜关系不大，雨天不该变成暖色）
2. 否则看是否落在**日出日落前后 40 分钟**  金色时刻
3. 否则按**昼夜**分：优先用 `sunrise`/`sunset` 区间；缺这两个字段时用 6:00~18:00 粗判；`obsTime` 缺失或损坏则退回浏览器时间
4. 天气数据还没到位时用 `day-clear`  加载期间就是原设计稿配色，不会闪

两个实现细节：

- **颜色必须压得住白字**：每个主题亮端的白字对比度都  2:1，测试里逐条算了一遍并打印（最浅的 `day-clear` 是 2.83:1，夜间主题 15:1 以上）。
- **切换不硬切**：`BackgroundLayer` 把上一个主题垫在底层，新主题用 `themeFade 700ms` 淡入，动画跑完前不卸载旧层。

> 开启城市照片后照片会盖住渐变，主题只在「没照片 / 照片加载失败」这两种情况下可见。

预览：浏览器打开 `themes-preview.html`，10 种主题都用真实字号和文案压制，可直接比对比度。
## 手机外壳

桌面端（640px）把内容装进手机外壳居中展示；真机 / 窄屏直接全屏，不套壳在真手机上再套一层壳没有意义。

| 结构 | 做法 |
| --- | --- |
| 机身 | `rounded-[54px]` + 三段金属渐变（`#4b4b4e  #1b1b1d  #3b3b3e`）+ 顶部内高光 + 大投影 |
| 屏幕 | 内缩 11px 留出黑边，圆角 44px（小于机身），外圈 1px 暗色 ring 分隔机身 |
| 灵动岛 | 11633 黑色胶囊 + 右侧一颗更暗的镜头点 |
| Home 指示条 | 1345 白色 35% 圆角条，离底 7px |
| 侧键 | 左侧「静音键 + 音量加减」共 3 个，右侧电源键 1 个，贴在机身外侧 3px |
| 反光 | 左上角一条 `white/7%` 斜向高光 |

三个容易踩的点：

1. **锁比例，而不是硬设尺寸**：`aspect-[375/812]` + `h-[min(812px,calc(100dvh_-_3rem))]`，屏幕矮的时候整机等比缩小，而不是被压扁。
    Tailwind 任意值里的 `calc` 必须用下划线代替空格（`100dvh_-_3rem`）。少写空格会生成 `calc(100dvh-3rem)` 这种无效 CSS，被浏览器整条丢弃原来的 `max-h-[calc(100dvh-3rem)]` 就是这样静默失效的。
2. **机身不能 `overflow-hidden`**：侧键贴在机身外侧，所以拆成「机身层（圆角 + 投影）」+「屏幕层（内缩 + `overflow-hidden` 裁内容）」，侧键是机身的兄弟节点。
3. **装饰层全部 `pointer-events-none`**，不会挡住按钮点击；灵动岛和 Home 条都排在内容之后，天然压在内容上面。
## 城市照片背景

左上角相册图标开关，**默认关闭**，开关状态存 LocalStorage。

| 项 | 说明 |
| --- | --- |
| 图源 | Wikimedia Commons 按经纬度搜附近照片（免 key，`origin=*` 跨域，`ggsnamespace=6` 只搜 File 命名空间） |
| 过滤 | 1200800、宽高比 0.55~2.4、仅 jpeg/png、标题含 map/flag/logo/poster 等一律排除 |
| 选图 | 先按标题排序保证稳定，再用 FNV-1a 哈希（`城市 + 日期` 当种子）确定性取一张 |
| 一致性 | 同一城市同一天固定同一张；结果当天写进 LocalStorage，第二天才换 |
| 兜底 | 网络失败 / 接口报错 / 没有合适照片 / 城市查不到，一律返回 null 并保留原渐变，不弹错误 |
| 署名 | 图库协议要求，照片显示时底部常驻「摄影 xxx  Wikimedia Commons」，链接到原图页面 |
| 可读性 | 照片上压一层黑渐变遮罩（顶部轻、底部重），保证白字与毛玻璃卡片的对比度 |

`BackgroundLayer.tsx` 的三层顺序不能反：**渐变铺底  照片淡入  遮罩**。少了遮罩白字会糊在亮照片上；没有渐变兜底则图片没加载出来时会白闪。

```ts
// 换图源只要实现这个接口，UI 与缓存层都不用动
export interface BackgroundProvider {
  id: 'wikimedia' | 'pexels' | 'local';
  resolve(location: ResolvedLocation, seed: string, signal?: AbortSignal): Promise<BackgroundImage | null>;
}
```

>  commons.wikimedia.org 在部分网络环境下访问不稳定。加载失败会自动退回渐变，不影响天气功能；想换更稳的图源（Pexels / 高德静态地图）只需新增一个 provider。
## 城市收藏

右上角星标收藏/取消收藏当前城市；搜索面板里能看到收藏列表，点一下直接切过去，点右侧  删除。

| 项 | 说明 |
| --- | --- |
| 存储 | LocalStorage，key 为 `weather-app:favorites:v1`（带版本号，将来改结构不会读崩老数据） |
| 去重 | 用 `locationCacheKey(query)` 当 id：`city:|上海市`、`coords:121.4737,31.2304` |
| 顺序 | 新收藏排最前，上限 20 条，超出丢弃最旧的 |
| 容错 | 脏数据逐条丢弃而不是整份清空；隐私模式下读写都抛错时降级为「本次会话有效」，不影响主流程 |

存储的是完整的 `LocationQuery` 而不只是城市名，所以按坐标查询的结果也能收藏、也能正确回查。

| 文件 | 职责 |
| --- | --- |
| `src/utils/favorites.ts` | 纯逻辑：解析、增删、去重、上限、读写存储（storage 可注入，方便测试） |
| `src/hooks/useFavorites.ts` | React 封装：状态 + 变更落盘 |
| `src/components/FavoriteButton.tsx` | 星标按钮（空心/实心 + aria-pressed） |
| `src/components/SearchPanel.tsx` | 收藏列表、当前城市高亮、删除按钮 |
## 目录结构

```
src/
|-- main.tsx
|-- App.tsx                     # 三屏装配 + 背景层 + 加载/错误态
|-- index.css
|-- data/cities.ts              # 内置城市库（搜索联想用）
|-- types/weather.ts            # 全局数据契约
|-- api/
|   |-- config.ts               # 环境变量（provider / base url / key / mock 开关 / 超时）
|   |-- error.ts                # ApiError + 文案映射
|   |-- client.ts               # fetch 封装：超时、鉴权、取消、错误收敛
|   |-- location.ts             # LocationQuery、坐标校验、地点缓存
|   |-- weather.ts              # getCurrentWeather / getForecast / getWeather / searchCities
|   |-- background.ts           # 城市背景图：解析地点 + 确定性选图 + 当日缓存
|   |-- mock.ts                 # 本地 mock 数据
|   +-- providers/
|       |-- types.ts            # WeatherProvider 接口
|       |-- index.ts            # 按环境变量选择天气数据源
|       |-- shared.ts           # 各数据源共用的字段处理（AQI 文案、星期等）
|       |-- qweather.ts         # 和风天气实现
|       |-- qweather.normalize.ts
|       |-- openweather.ts      # OpenWeatherMap（One Call + 免费版 2.5）
|       |-- openweather.normalize.ts
|       |-- background.types.ts # BackgroundProvider 接口
|       +-- wikimedia.ts        # Wikimedia Commons 图源
|-- hooks/
|   |-- useWeather.ts           # 请求状态：loading / ok / error + reload
|   |-- usePageSwiper.ts        # 横滑 / 鼠标拖拽 / 键盘 + 页码联动
|   |-- useCitySuggestions.ts   # 搜索联想（本地同步 + 接口防抖）
|   |-- useFavorites.ts         # 收藏城市
|   +-- useCityBackground.ts    # 背景开关 + 背景图解析
|-- components/
|   |-- PhoneFrame.tsx          # 桌面端手机画框
|   |-- BackgroundLayer.tsx     # 渐变 / 照片 / 遮罩三层
|   |-- BackgroundCredit.tsx    # 图片署名
|   |-- Screen.tsx              # 单屏容器
|   |-- Card.tsx                # 毛玻璃卡片 + 卡片标题
|   |-- PageIndicator.tsx       # 底部页码圆点
|   |-- SearchPanel.tsx         # 搜索面板
|   |-- SuggestionList.tsx      # 联想列表
|   |-- FavoriteButton.tsx      # 收藏星标
|   |-- Spinner.tsx             # 加载动画
|   |-- WeatherIcon.tsx         # 内联 SVG 图标集
|   |-- pages/                  # NowPage / ForecastPage / DetailPage
|   +-- cards/                  # RainCard / HourlyCard / DailyCard / TempRangeBar / DetailGrid
+-- utils/
    |-- format.ts               # 温度等展示格式化
    |-- favorites.ts            # 收藏的纯逻辑（解析 / 增删 / 上限）
    |-- citySuggest.ts          # 城市名匹配打分与合并
    +-- storage.ts              # LocalStorage 薄封装
```

## 实现要点

- **provider 抽象**：`WeatherProvider` 只要求实现 `resolveLocation()` 和 `fetchWeather()`，新增数据源不用动视图层和 `weather.ts`。
- **单位换算**：OWM 的 `wind_speed`（米/秒）会换算成蒲福风级，`wind_deg` 换算成中文风向，`visibility`（米）换算成公里。
- **时区**：One Call 的时间戳是 UTC 秒，配合 `timezone_offset` 用 `getUTC*` 读取，保证「15时」显示的是城市本地时间而不是浏览器时间。
- **空气质量口径不同**：和风天气返回国标 AQI 数值（45 优），OWM 只给 1~5 等级索引，代码里映射成中文等级，数值直接展示索引。
- **图标映射**：两个数据源的图标编号分别映射到统一的 `WeatherIcon` 枚举（含夜间 `night`），视图层不感知数据源。
- **天气图标全部是自绘内联 SVG**，不依赖 emoji 与图标库。

## 数据源差异备忘

| 字段 | QWeather | OpenWeatherMap |
| --- | --- | --- |
| 紫外线 | 需额外 indices 接口，暂为 `null` | One Call `current.uvi` 直接有 |
| 降水概率 | 无，`pop` 为 `null` | `hourly[].pop` |
| 逐天温度区间 | `tempMax` / `tempMin` | `temp.min` / `temp.max`（4.0 若拍平为 `temp_min` 也已兼容） |
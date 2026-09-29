/**
 * 全局数据契约：组件只依赖这里的类型，不接触数据源原始字段。
 * 真实接口拿不到的字段统一为 null，由 UI 降级显示为 "--"。
 */

export type WeatherIcon =
  | 'sunny'
  | 'night'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'snow'
  | 'thunder'
  | 'fog'
  | 'sunset'
  | 'sunrise';

export type AqiLevel = '优' | '良' | '轻度污染' | '中度污染' | '重度污染' | '严重污染';

export interface CurrentWeather {
  temp: number;
  condition: string;
  icon: WeatherIcon;
  /** 当日最高/最低温，来自当日预报，由 getWeather() 合并填充 */
  tempMax: number | null;
  tempMin: number | null;
  aqi: number | null;
  aqiLevel: AqiLevel | null;
  aqiAdvice: string | null;
  humidity: number | null;
  dewPoint: number | null;
  feelsLike: number | null;
  /** 蒲福风级 */
  windScale: number | null;
  /** 中文风向，如「东北风」 */
  windDir: string | null;
  /** 风速，统一换算成 km/h */
  windSpeed: number | null;
  uvIndex: number | null;
  /** 能见度，单位 km */
  visibility: number | null;
  sunrise: string | null;
  sunset: string | null;
  /** 数据观测时间，ISO8601 */
  obsTime: string;
}

export interface HourlyItem {
  /** 数据源原始时间，ISO8601 */
  time: string;
  /** 展示用标签：首列为「现在」，其余为「15时」 */
  label: string;
  temp: number;
  icon: WeatherIcon;
  /** 降水量 mm，可能为 null */
  precip: number | null;
  /** 降水概率 0~1，可能为 null */
  pop: number | null;
}

export interface DailyItem {
  /** 展示用标签：今天 / 明天 / 周三 */
  day: string;
  /** 日期 YYYY-MM-DD（按城市本地时区） */
  date: string;
  icon: WeatherIcon;
  tempMin: number;
  tempMax: number;
  sunrise: string | null;
  sunset: string | null;
}

export interface RainInfo {
  summary: string;
  hasRain: boolean;
}

export interface WeatherData {
  location: { city: string; cityId: string };
  current: CurrentWeather;
  rain: RainInfo;
  hourly: HourlyItem[];
  daily: DailyItem[];
}
/** 城市搜索建议 */
export interface CitySuggestion {
  name: string;
  /** 上级行政区，用于同名消歧 */
  adm?: string;
  pinyin?: string;
  source: 'favorite' | 'local' | 'remote';
}
/** 城市背景图 */
export interface BackgroundImage {
  /** 可直接放进 img 的地址（缩略图，够手机屏用） */
  url: string;
  /** 作者，按图库协议需要署名 */
  author?: string;
  /** 图片详情页，署名的链接目标 */
  sourceUrl?: string;
  /** 图片标题 */
  title?: string;
}
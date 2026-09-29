/**
 * 环境配置：全部从环境变量读取。
 * Vite 只会注入 VITE_ 前缀的变量，改完 .env 需要重启 dev server。
 */

export type ProviderId = 'qweather' | 'openweathermap';

const DEFAULT_TIMEOUT_MS = 8000;

/** 去掉结尾多余的斜杠，避免拼出 //v7/weather */
const trimSlash = (value: string) => value.replace(/\/+$/, '');

/** "true" / "1" / "yes" / "on" 都算开；无法识别返回 null（而不是静默当成 false） */
export function parseBooleanToken(value: string | undefined): boolean | null {
  if (value === undefined) return null;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return null;
}

/** 只认 openweathermap，其余一律回退到和风天气 */
export function parseProviderToken(value: string | undefined): ProviderId {
  return value?.trim().toLowerCase() === 'openweathermap' ? 'openweathermap' : 'qweather';
}

/** OpenWeatherMap 接口模式：auto = 先试 One Call，未订阅则自动降级到免费版 2.5 接口 */
export type OpenWeatherApiMode = 'auto' | 'onecall' | 'free';

export function parseOpenWeatherMode(value: string | undefined): OpenWeatherApiMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'onecall' || normalized === 'free' ? normalized : 'auto';
}

/* ---------------- 和风天气 QWeather ---------------- */

export const QWEATHER_API_BASE_URL = trimSlash(
  import.meta.env.VITE_WEATHER_API_BASE_URL || 'https://devapi.qweather.com',
);
export const QWEATHER_GEO_BASE_URL = trimSlash(
  import.meta.env.VITE_WEATHER_GEO_BASE_URL || 'https://geoapi.qweather.com',
);
export const QWEATHER_API_KEY = (import.meta.env.VITE_WEATHER_API_KEY ?? '').trim();

/* ---------------- OpenWeatherMap ---------------- */

/** 同一个域名下按路径区分版本：/data/4.0/onecall、/data/2.5/air_pollution、/geo/1.0/direct */
export const OPENWEATHER_API_BASE_URL = trimSlash(
  import.meta.env.VITE_OPENWEATHER_API_BASE_URL || 'https://api.openweathermap.org',
);
export const OPENWEATHER_API_KEY = (import.meta.env.VITE_OPENWEATHER_API_KEY ?? '').trim();

/** metric = 摄氏度 + 米/秒，与我们的数据模型一致 */
export const OPENWEATHER_UNITS = import.meta.env.VITE_OPENWEATHER_UNITS || 'metric';
/** 让 OWM 直接返回中文天气描述 */
export const OPENWEATHER_LANG = import.meta.env.VITE_OPENWEATHER_LANG || 'zh_cn';

/** 接口模式：auto（默认，自动降级）/ onecall / free */
export const OPENWEATHER_API_MODE: OpenWeatherApiMode = parseOpenWeatherMode(
  import.meta.env.VITE_OPENWEATHER_API_MODE,
);

/* ---------------- 通用 ---------------- */

/** 当前使用的数据源：qweather（默认）或 openweathermap */
export const ACTIVE_PROVIDER: ProviderId = parseProviderToken(import.meta.env.VITE_WEATHER_PROVIDER);

/** true = 使用本地 mock 数据，不发网络请求 */
export const USE_MOCK = parseBooleanToken(import.meta.env.VITE_USE_MOCK) ?? false;

/** 单次请求超时时间（毫秒） */
export const REQUEST_TIMEOUT_MS =
  Number(import.meta.env.VITE_REQUEST_TIMEOUT ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

/** mock 模式下模拟的网络延迟，方便调试骨架屏，可改为 0 */
export const MOCK_LATENCY_MS = 250;

export function apiKeyFor(provider: ProviderId): string {
  return provider === 'openweathermap' ? OPENWEATHER_API_KEY : QWEATHER_API_KEY;
}

export function providerLabel(provider: ProviderId): string {
  return provider === 'openweathermap' ? 'OpenWeatherMap' : '和风天气';
}

/** 该数据源对应的环境变量名，用于错误提示 */
export function providerEnvVar(provider: ProviderId): string {
  return provider === 'openweathermap' ? 'VITE_OPENWEATHER_API_KEY' : 'VITE_WEATHER_API_KEY';
}

/* ---------------- 启动自检 ---------------- */

export interface ConfigIssue {
  level: 'error' | 'warn';
  message: string;
}

export interface ConfigInput {
  mockToken: string | undefined;
  providerToken: string | undefined;
  activeProvider: ProviderId;
  key: string;
  /** 仅 OWM 使用 */
  modeToken?: string | undefined;
}

/**
 * 纯函数：把环境变量当入参传进来，方便单测。
 * 目的就是让「VITE_USE_MOCK 拼错」「Key 填到了另一个数据源那栏」这类问题在启动时就暴露，
 * 而不是等到请求失败后报一个指向别处的错。
 */
export function collectConfigIssues(input: ConfigInput): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const { mockToken, providerToken, activeProvider, key } = input;

  const mockEnabled = parseBooleanToken(mockToken);
  if (mockToken !== undefined && mockToken.trim() !== '' && mockEnabled === null) {
    issues.push({
      level: 'error',
      message: `VITE_USE_MOCK 的值「${mockToken.trim()}」无法识别，请填 true 或 false（当前按 false 处理）`,
    });
  }

  if (providerToken !== undefined && providerToken.trim() !== '' && parseProviderToken(providerToken) !== providerToken.trim().toLowerCase()) {
    issues.push({
      level: 'warn',
      message: `VITE_WEATHER_PROVIDER 的值「${providerToken.trim()}」无法识别，已回退到 qweather（可选值：qweather / openweathermap）`,
    });
  }

  if (
    input.modeToken !== undefined &&
    input.modeToken.trim() !== '' &&
    parseOpenWeatherMode(input.modeToken) === 'auto' &&
    input.modeToken.trim().toLowerCase() !== 'auto'
  ) {
    issues.push({
      level: 'warn',
      message: `VITE_OPENWEATHER_API_MODE 的值「${input.modeToken.trim()}」无法识别，已按 auto 处理（可选值：auto / onecall / free）`,
    });
  }

  if (!(mockEnabled ?? false) && !key) {
    const other: ProviderId = activeProvider === 'qweather' ? 'openweathermap' : 'qweather';
    const otherKey = other === 'openweathermap' ? OPENWEATHER_API_KEY : QWEATHER_API_KEY;
    const hint = otherKey
      ? `检测到 ${providerEnvVar(other)} 已经填了值，如果你本来想用${providerLabel(other)}，把 VITE_WEATHER_PROVIDER 改成 ${other}`
      : '';

    issues.push({
      level: 'error',
      message:
        `当前数据源是${providerLabel(activeProvider)}，但没有读到 ${providerEnvVar(activeProvider)}。` +
        `请把它填到 .env.local 后重启 dev server，或把 VITE_USE_MOCK 设为 true 使用本地数据。` +
        (hint ? ` ${hint}` : ''),
    });
  }

  return issues;
}

/** 启动时调用一次，把配置问题打到控制台 */
export function inspectConfig(): ConfigIssue[] {
  return collectConfigIssues({
    mockToken: import.meta.env.VITE_USE_MOCK,
    providerToken: import.meta.env.VITE_WEATHER_PROVIDER,
    activeProvider: ACTIVE_PROVIDER,
    key: apiKeyFor(ACTIVE_PROVIDER),
    modeToken: import.meta.env.VITE_OPENWEATHER_API_MODE,
  });
}
/**
 * HTTP 客户端：只负责「发请求 + 收敛错误」，不含业务语义。
 * 鉴权方式由调用方通过 auth 传入（和风天气用 query + header，OWM 用 appid）。
 */

import { REQUEST_TIMEOUT_MS } from './config';
import { ApiError, providerErrorMessage } from './error';

export type QueryValue = string | number | boolean | undefined | null;

export interface AuthConfig {
  /** 放在 query 上的参数名，如 key / appid */
  paramName?: string;
  /** 放在请求头上的名字，如 X-QW-Api-Key */
  headerName?: string;
  key: string;
  providerLabel: string;
  /** 对应的环境变量名，缺 Key 时直接提示用户去改哪个变量（公开接口不需要） */
  envVar?: string;
}

/** 免鉴权的公开接口（如 Wikimedia）直接用它，不会附加任何密钥 */
export const PUBLIC_AUTH: AuthConfig = { key: 'public', providerLabel: '公开接口' };

export interface RequestOptions {
  /** 查询参数，值为 undefined / null / '' 时会被跳过 */
  params?: Record<string, QueryValue>;
  /** 覆盖默认 base url（GeoAPI 等不同域名时使用） */
  baseUrl: string;
  auth: AuthConfig;
  /** 外部取消信号，取消时原样抛出 AbortError，不包装成 ApiError */
  signal?: AbortSignal;
}

interface ProviderEnvelope {
  code?: string | number;
  cod?: string | number;
  message?: string;
}

/**
 * 发起 GET 请求并返回 JSON。
 * 失败时统一抛出 ApiError（code 见 error.ts）。
 */
export async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const { auth } = options;

  if (!auth.key) {
    const hint = auth.envVar
      ? `请在 .env.local 填写 ${auth.envVar} 后重启 dev server，或`
      : '';
    throw new ApiError(
      'CONFIG',
      `缺少 ${auth.providerLabel} 的 API Key：${hint}把 VITE_USE_MOCK 设为 true 使用本地数据`,
    );
  }

  const url = buildUrl(options.baseUrl, path, options.params, auth);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortByCaller = () => controller.abort();
  if (options.signal) {
    // 传进来就已经是取消态时，abort 事件不会再触发，必须主动同步一次
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', abortByCaller);
  }

  try {
    const response = await send(url, controller.signal, auth, options.signal);
    const payload = await parseJson(response);
    assertProviderSuccess(response, payload);
    return payload as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortByCaller);
  }
}

function buildUrl(baseUrl: string, path: string, params: Record<string, QueryValue> | undefined, auth: AuthConfig): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  if (auth.paramName) url.searchParams.set(auth.paramName, auth.key);
  return url;
}

async function send(url: URL, signal: AbortSignal, auth: AuthConfig, callerSignal?: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth.headerName) headers[auth.headerName] = auth.key;

  try {
    return await fetch(url, { method: 'GET', headers, signal });
  } catch (error) {
    if (callerSignal?.aborted) throw error;
    if (isAbortError(error)) {
      throw new ApiError('TIMEOUT', `请求超时（超过 ${REQUEST_TIMEOUT_MS}ms）`, { detail: error });
    }
    throw new ApiError('NETWORK', '网络请求失败，请检查网络连接或 API 域名是否正确', { detail: error });
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    // 非 2xx 且响应体不是 JSON（如网关返回 HTML），交给状态码分支报错
    if (!response.ok) return null;
    throw new ApiError('PARSE', '数据源返回的内容不是合法 JSON', {
      status: response.status,
      detail: error,
    });
  }
}

/** 2xx + 业务 code 双重要求都通过才算成功（和风天气用 code，OWM 用 cod） */
function assertProviderSuccess(response: Response, payload: unknown): void {
  const code = readEnvelopeField(payload, 'code') ?? readEnvelopeField(payload, 'cod');
  const message = readEnvelopeField(payload, 'message');

  if (!response.ok) {
    const reason = message || (code ? providerErrorMessage(code) : response.statusText || '请求失败');
    throw new ApiError('HTTP', `接口返回 HTTP ${response.status}：${reason}`, {
      status: response.status,
      providerCode: code,
    });
  }

  if (code && code !== '200' && code !== '0') {
    throw new ApiError('PROVIDER', message || providerErrorMessage(code), {
      status: response.status,
      providerCode: code,
    });
  }
}

function readEnvelopeField(payload: unknown, field: keyof ProviderEnvelope): string | undefined {
  // 数组响应（如 OWM 地理编码）没有外层 code 字段
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  if (!(field in payload)) return undefined;

  const value = (payload as ProviderEnvelope)[field];
  return value === undefined || value === null ? undefined : String(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : (error as { name?: string })?.name === 'AbortError';
}
/**
 * 统一错误模型：所有网络层异常都会被收敛成 ApiError，
 * UI 只需判断 error.code 或直接用 toUserMessage()。
 */

export type ApiErrorCode =
  | 'CONFIG' // 环境变量缺失 / 入参不合法
  | 'TIMEOUT' // 请求超时
  | 'NETWORK' // 网络不可达
  | 'HTTP' // 非 2xx
  | 'PROVIDER' // 数据源返回业务错误码
  | 'PARSE' // 响应不是合法 JSON
  | 'NOT_FOUND'; // 城市查不到

export interface ApiErrorOptions {
  status?: number;
  providerCode?: string;
  detail?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly providerCode?: string;
  readonly detail?: unknown;

  constructor(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
    this.providerCode = options.providerCode;
    this.detail = options.detail;
    // 某些编译目标下继承内置 Error 会丢原型链，这里显式修正
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static is(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

/** 和风天气业务错误码说明 */
const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
  '204': '请求成功，但该地区没有数据',
  '400': '请求参数错误，请检查城市名或经纬度',
  '401': '认证失败，请检查 API Key 与 API Host 是否匹配',
  '402': '超出访问次数或余额不足',
  '403': '无权限访问该数据，当前套餐可能未订阅该接口',
  '404': '查询的城市或地区不存在',
  '429': '请求过于频繁，请稍后重试',
  '500': '数据源服务端错误',
};

export function providerErrorMessage(code: string): string {
  const known = PROVIDER_ERROR_MESSAGES[code];
  return known ? `${known}（code ${code}）` : `数据源返回错误码 ${code}`;
}

/** 给 UI 展示的兜底文案 */
export function toUserMessage(error: unknown): string {
  if (!ApiError.is(error)) return '发生未知错误，请稍后重试';

  switch (error.code) {
    case 'TIMEOUT':
      return '请求超时，请检查网络后重试';
    case 'NETWORK':
      return '网络异常，请检查网络连接';
    case 'PARSE':
      return '数据解析失败，请稍后重试';
    case 'CONFIG':
    case 'NOT_FOUND':
      return error.message;
    default:
      return '天气数据获取失败，请稍后重试';
  }
}
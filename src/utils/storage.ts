/**
 * LocalStorage 薄封装：拿不到存储（隐私模式 / SSR）时统一返回 null，
 * 读写都包 try/catch，调用方不用关心异常。
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 拿不到 localStorage 时返回 null */
export function safeStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, storage: StorageLike | null = safeStorage()): T | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, storage: StorageLike | null = safeStorage()): void {
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式或超配额：忽略写入失败，功能降级为「本次会话有效」
  }
}

export function readFlag(key: string, fallback: boolean): boolean {
  const value = readJson<unknown>(key, safeStorage());
  return typeof value === 'boolean' ? value : fallback;
}

export function writeFlag(key: string, value: boolean): void {
  writeJson(key, value, safeStorage());
}
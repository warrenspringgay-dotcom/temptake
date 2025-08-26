// Simple, typed localStorage helpers + a typed React hook

export function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota/serialize errors
  }
}

export function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Merge helper for partial updates on object-like state
 * (kept generic; caller decides the shape)
 */
export function mergeUpdate<T extends object>(prev: T, patch: Partial<T>): T {
  return { ...prev, ...patch };
}

/**
 * Parse with a provided validator to avoid `any`.
 * `validator` should refine unknown into `T` (returning fallback on failure).
 */
export function parseWith<T>(raw: string | null, validator: (u: unknown) => T, fallback: T): T {
  try {
    const u = raw === null ? null : (JSON.parse(raw) as unknown);
    return validator(u);
  } catch {
    return fallback;
  }
}

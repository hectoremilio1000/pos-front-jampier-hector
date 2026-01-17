// /src/utils/jwt.ts
export function normalizeExpToMs(exp: number | string | null): number | null {
  if (exp == null) return null;
  const n = Number(exp);
  if (Number.isNaN(n)) return null;
  // Si viene en segundos (< 1e12), conviértelo a milisegundos
  return n < 1e12 ? n * 1000 : n;
}

export function isExpValidMs(
  expMs: number | null,
  thresholdMs = 15_000
): boolean {
  if (!expMs) return false;
  return expMs - Date.now() > thresholdMs;
}

const AUTH_KEYS = [
  "token",
  "access_jwt",
  "access_jwt_exp",
  "refresh_token",
] as const;

export type AuthKey = (typeof AUTH_KEYS)[number];

const hasWindow = typeof window !== "undefined";

function getSessionItem(key: AuthKey): string | null {
  if (!hasWindow) return null;
  return window.sessionStorage.getItem(key);
}

function getLocalItem(key: AuthKey): string | null {
  if (!hasWindow) return null;
  return window.localStorage.getItem(key);
}

export function getAuthItem(key: AuthKey): string | null {
  return getSessionItem(key) ?? getLocalItem(key);
}

export function setAuthItem(key: AuthKey, value: string): void {
  if (!hasWindow) return;
  window.sessionStorage.setItem(key, value);
  window.localStorage.setItem(key, value);
}

export function removeAuthItem(key: AuthKey): void {
  if (!hasWindow) return;
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

export function clearAuthStorage(): void {
  AUTH_KEYS.forEach((key) => removeAuthItem(key));
}

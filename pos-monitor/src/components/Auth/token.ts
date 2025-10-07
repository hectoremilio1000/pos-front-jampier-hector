import apiAuth from "@/components/apis/apiAuth";

let refreshInFlight: Promise<void> | null = null;

export function getAccessJwtSync(): string | null {
  return sessionStorage.getItem("access_jwt");
}

export function isAccessJwtValid(): boolean {
  const expStr = sessionStorage.getItem("access_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000; // 15s de margen
}

async function refreshAccessJwt(): Promise<void> {
  const refresh = sessionStorage.getItem("refresh_token");
  if (!refresh) throw new Error("no_refresh_token");

  const { data } = await apiAuth.post("/auth/refresh", {
    refresh_token: refresh,
  });

  const access = data.access_jwt as string;
  const ttl = Number(data.expires_in ?? 600);
  const newRef = data.refresh_token as string | undefined;

  sessionStorage.setItem("access_jwt", access);
  sessionStorage.setItem("access_jwt_exp", String(Date.now() + ttl * 1000));
  if (newRef) sessionStorage.setItem("refresh_token", newRef);
}

export async function getFreshAccessJwt(): Promise<string> {
  if (isAccessJwtValid()) {
    const t = getAccessJwtSync();
    if (t) return t;
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessJwt().finally(
      () => (refreshInFlight = null)
    );
  }
  await refreshInFlight;
  const t = getAccessJwtSync();
  if (!t) throw new Error("refresh_failed");
  return t;
}

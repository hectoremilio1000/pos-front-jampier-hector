// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/components/Auth/token.ts
import apiAuth from "@/components/apis/apiAuth";

let refreshInFlight: Promise<void> | null = null;

export function getAccessJwtSync(): string | null {
  return sessionStorage.getItem("access_jwt");
}

export function isAccessJwtValid(): boolean {
  const expStr = sessionStorage.getItem("access_jwt_exp");
  if (!expStr) return false;
  const expMs = Number(expStr);
  const now = Date.now();
  // refresca si faltan < 15s para expirar
  return expMs - now > 15_000;
}

async function refreshAccessJwt(): Promise<void> {
  const refresh = sessionStorage.getItem("refresh_token");
  if (!refresh) throw new Error("no_refresh_token");

  const resp = await apiAuth.post("/auth/refresh", {
    refresh_token: refresh,
  });

  const access = resp.data.access_jwt as string;
  const expiresIn = Number(resp.data.expires_in ?? 600);
  const newRefresh = resp.data.refresh_token as string | undefined;

  sessionStorage.setItem("access_jwt", access);
  sessionStorage.setItem(
    "access_jwt_exp",
    String(Date.now() + expiresIn * 1000)
  );
  if (newRefresh) sessionStorage.setItem("refresh_token", newRefresh);
}

export async function getFreshAccessJwt(): Promise<string> {
  // si aún es válido, úsalo
  if (isAccessJwtValid()) {
    const t = getAccessJwtSync();
    if (t) return t;
  }
  // evita múltiples refresh simultáneos
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessJwt().finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
  const t = getAccessJwtSync();
  if (!t) throw new Error("refresh_failed");
  return t;
}

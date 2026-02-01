// src/components/apis/apiCash.ts
import axios, { AxiosError } from "axios";

/** ─────────────────────────────────────────────
 * Helpers de token (guardados en sessionStorage)
 * ─────────────────────────────────────────────*/
const getJwt = () => sessionStorage.getItem("access_jwt");
const getJwtExpMs = () => Number(sessionStorage.getItem("access_jwt_exp") || 0);
const getRefreshToken = () => sessionStorage.getItem("refresh_token");

// Considera el JWT inválido si faltan <15s
const isJwtValid = () => getJwt() && getJwtExpMs() - Date.now() > 15_000;

// Evita refresh concurrentes
let refreshInFlight: Promise<void> | null = null;

async function refreshAccessJwt(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("no_refresh_token");

  const url = `${import.meta.env.VITE_API_URL_AUTH}/auth/refresh`; // ej: http://localhost:3333/api/auth/refresh
  const resp = await axios.post(url, { refresh_token: refresh });

  const access = resp.data?.access_jwt as string;
  const ttl = Number(resp.data?.expires_in ?? 600);
  const newRefresh = resp.data?.refresh_token as string | undefined;

  if (!access) throw new Error("refresh_response_missing_access_jwt");

  sessionStorage.setItem("access_jwt", access);
  sessionStorage.setItem("access_jwt_exp", String(Date.now() + ttl * 1000));
  if (newRefresh) sessionStorage.setItem("refresh_token", newRefresh);
}

async function getFreshJwt(): Promise<string> {
  if (isJwtValid()) return getJwt()!;
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessJwt().finally(
      () => (refreshInFlight = null),
    );
  }
  await refreshInFlight;
  const jwt = getJwt();
  if (!jwt) throw new Error("refresh_failed");
  return jwt;
}

/** ─────────────────────────────────────────────
 *  Axios instance para pos-cash-api
 * ─────────────────────────────────────────────*/
const apiCash = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH, // ej: http://localhost:3335/api
});

// Request: asegura un JWT fresco y lo pone en Authorization
apiCash.interceptors.request.use(async (config) => {
  const jwt = await getFreshJwt();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

// Response: si regresa 401 por exp, intenta 1 refresh y reintenta la petición
apiCash.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<any>) => {
    const resp = error.response;
    const original: any = error.config || {};
    const is401 = resp?.status === 401;
    const notRetried = !original.__retried;

    if (is401 && notRetried) {
      try {
        original.__retried = true;
        await getFreshJwt(); // esto ya refresca si hace falta
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${getJwt()}`;
        return axios(original);
      } catch {
        // si falla el refresh, cae al reject y el front puede forzar relogin
      }
    }
    return Promise.reject(error);
  },
);

export default apiCash;

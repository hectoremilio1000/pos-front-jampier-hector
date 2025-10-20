// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/apis/apiCash.tsx

import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getFreshAccessJwt } from "@/components/Auth/token";

/**
 * Cliente de Caja (panel) protegido con access_jwt (no confundir con kiosk_jwt).
 * Usar SOLO para endpoints de VITE_API_URL_CASH.
 * Para /kiosk/* usa apiKiosk (VITE_API_URL_AUTH) sin interceptor de panel.
 */
const apiCash = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH, // ej: http://localhost:3335/api
  timeout: 20000,
});

// ---- Request: asegura JWT fresco y setea Authorization ----
apiCash.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const jwt = await getFreshAccessJwt();
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>)["Authorization"] = `Bearer ${jwt}`;
  return config;
});

// ---- Response: maneja sesión vencida/refresco y reintento único ----
apiCash.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    if (String(err?.message || "").includes("no_refresh_token")) {
      try {
        sessionStorage.clear();
      } catch {}
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(err);
    }

    const original: any = err.config || {};
    if (err.response?.status === 401 && !original.__retried) {
      try {
        original.__retried = true;
        const jwt = await getFreshAccessJwt();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${jwt}`;
        return axios(original);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default apiCash;

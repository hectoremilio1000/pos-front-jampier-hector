// src/components/apis/apiOrder.ts
import axios from "axios";
import { getFreshAccessJwt } from "../Auth/token"; // helper que refresca si hace falta

const ORDER_API_BASE =
  import.meta.env.VITE_API_URL_ORDER || "http://localhost:3341/api";

const apiOrder = axios.create({
  baseURL: ORDER_API_BASE, // ej: http://localhost:3341/api
});

// Request: asegura un JWT fresco y lo pone en Authorization
apiOrder.interceptors.request.use(async (config) => {
  const jwt = await getFreshAccessJwt(); // refresca si expira / va a expirar
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

// Response:
// - Si falta refresh_token (sesión vieja) → limpia y manda a /login
// - Si es 401 por expirar → refresca y reintenta 1 vez
apiOrder.interceptors.response.use(
  (r) => r,
  async (err) => {
    // Sesión vieja (no_refresh_token desde getFreshAccessJwt/refresh)
    if (String(err?.message || "").includes("no_refresh_token")) {
      sessionStorage.clear();
      window.location.href = "/login";
      return;
    }

    // Si no hay response (network error), propaga
    if (!err?.response) return Promise.reject(err);

    // Reintento único tras refresh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original: any = err.config || {};
    if (err.response.status === 401 && !original.__retried) {
      try {
        original.__retried = true;
        const jwt = await getFreshAccessJwt();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${jwt}`;
        return axios(original);
      } catch {
        // si falla el refresh, dejamos que el caller maneje el error
      }
    }

    return Promise.reject(err);
  }
);

export default apiOrder;

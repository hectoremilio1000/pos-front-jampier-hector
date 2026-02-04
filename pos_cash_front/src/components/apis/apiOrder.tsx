// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/apis/apiOrder.tsx

import axios from "axios";
import { getFreshAccessJwt } from "@/components/Auth/token"; // asegúrate de esta ruta

const apiOrder = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER, // ej: http://localhost:3334/api
});

// Request: asegura un JWT fresco y lo pone en Authorization
apiOrder.interceptors.request.use(async (config) => {
  const jwt = await getFreshAccessJwt(); // usa access_jwt (refresca si hace falta)
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

// Response:
// - Si falta refresh_token (sesión vieja) → limpia y redirige a /login
// - Si 401 (expirado) → refresca y reintenta UNA vez
apiOrder.interceptors.response.use(
  (r) => r,
  async (err) => {
    const msg = String(err?.message || "");
    if (msg.includes("no_refresh_token")) {
      sessionStorage.clear();
      window.location.href = "/login";
      // devolvemos una promesa rechazada para cumplir el tipo y cortar el flujo
      return Promise.reject(err);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original: any = err.config || {};
    if (err.response?.status === 401 && !original.__retried) {
      try {
        original.__retried = true;
        const jwt = await getFreshAccessJwt();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${jwt}`;
        return axios(original);
      } catch (refreshErr) {
        // si el refresh falla, propagamos el error
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default apiOrder;

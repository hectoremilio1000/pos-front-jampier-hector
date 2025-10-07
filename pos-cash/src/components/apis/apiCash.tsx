import axios from "axios";
import { getFreshAccessJwt } from "@/components/Auth/token";

const apiCash = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH, // http://localhost:3335/api
});

// Request: asegura JWT fresco
apiCash.interceptors.request.use(async (config) => {
  const jwt = await getFreshAccessJwt();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

// Response: si falta refresh_token ⇒ sesión vieja; si 401 ⇒ reintenta una vez
apiCash.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (String(err?.message || "").includes("no_refresh_token")) {
      sessionStorage.clear();
      window.location.href = "/login";
      return;
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

export default apiCash;

import axios from "axios";
import { getFreshAccessJwt } from "../Auth/token";

const apiOrderAuth = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER,
});

apiOrderAuth.interceptors.request.use(async (config) => {
  const jwt = await getFreshAccessJwt();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

apiOrderAuth.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (String(err?.message || "").includes("no_refresh_token")) {
      sessionStorage.clear();
      window.location.href = "/login";
      return;
    }

    if (!err?.response) return Promise.reject(err);

    const original: any = err.config || {};
    if (err.response.status === 401 && !original.__retried) {
      try {
        original.__retried = true;
        const jwt = await getFreshAccessJwt();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${jwt}`;
        return axios(original);
      } catch {
        // fallthrough
      }
    }

    return Promise.reject(err);
  }
);

export default apiOrderAuth;

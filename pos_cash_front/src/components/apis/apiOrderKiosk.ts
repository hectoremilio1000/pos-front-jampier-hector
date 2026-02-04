// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/apis/apiOrderKiosk.ts

import axios from "axios";

function isValidKioskJwt() {
  const exp = Number(sessionStorage.getItem("kiosk_jwt_exp") || 0);
  return exp - Date.now() > 15_000;
}

async function ensureKioskJwt(): Promise<string> {
  const jwt = sessionStorage.getItem("kiosk_jwt");
  if (jwt && isValidKioskJwt()) return jwt;
  throw new Error("kiosk_jwt_missing");
}

const apiOrderKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER, // ej: http://localhost:3334/api
  timeout: 20000,
});

apiOrderKiosk.interceptors.request.use(async (config) => {
  const jwt = await ensureKioskJwt();
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>)["Authorization"] = `Bearer ${jwt}`;
  const sid = sessionStorage.getItem("cash_shift_id");
  if (sid) (config.headers as Record<string, string>)["X-Shift-Id"] = sid;
  return config;
});

apiOrderKiosk.interceptors.response.use(
  (r) => r,
  async (err) => {
    const msg = String(err?.message || "");
    const status = err?.response?.status;
    const method = err?.config?.method || "";
    const url = err?.config?.url || "";
    const serverError = String(err?.response?.data?.error || "");
    if (status === 401) {
      console.warn("[kiosk] 401", {
        method,
        url,
        error: serverError,
      });
    }
    if (
      msg.includes("kiosk_jwt_missing") ||
      (status === 401 &&
        (serverError.toLowerCase().includes("token") ||
          serverError.toLowerCase().includes("jwt") ||
          serverError.toLowerCase().includes("missing_bearer") ||
          serverError.toLowerCase().includes("invalid_kiosk")))
    ) {
      try {
        sessionStorage.removeItem("kiosk_jwt");
        sessionStorage.removeItem("kiosk_jwt_exp");
      } catch {}
      if (typeof window !== "undefined")
        window.location.replace("/kiosk-login");
      return;
    }
    return Promise.reject(err);
  }
);

export default apiOrderKiosk;

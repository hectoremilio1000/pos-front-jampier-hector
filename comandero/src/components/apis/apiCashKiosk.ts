// src/components/apis/apiCashKiosk.ts
import axios from "axios";

/** Lee el JWT del kiosko (emparejado + PIN) */
function getKioskJwt(): string {
  return sessionStorage.getItem("kiosk_jwt") || "";
}

const apiCashKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH, // ej: http://localhost:3335/api
});

apiCashKiosk.interceptors.request.use(async (config) => {
  const jwt = getKioskJwt();
  config.headers = config.headers ?? {};
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

apiCashKiosk.interceptors.response.use(
  (r) => r,
  async (err) => {
    // Importante: NO limpies todo el sessionStorage (no usar sessionStorage.clear()).
    // Si el JWT del kiosko caducó o es inválido, solo regresa 401 y deja que el guard/Provider decida.
    if (err?.response?.status === 401) {
      // No navegamos aquí; el guard redirige si corresponde.
    }
    return Promise.reject(err);
  }
);

export default apiCashKiosk;

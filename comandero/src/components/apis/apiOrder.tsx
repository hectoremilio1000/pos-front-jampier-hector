import axios from "axios";
import { getFreshKioskJwt } from "@/components/Kiosk/token";

const apiOrder = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER, // ej: http://localhost:3334/api
});

// Provee un callback para solicitar PIN cuando el kiosk_jwt caduque
async function askPin(): Promise<string> {
  const pin = window.prompt("PIN de operador (6 dígitos):") || "";
  if (!/^\d{6}$/.test(pin)) throw new Error("invalid_pin");
  return pin;
}

apiOrder.interceptors.request.use(async (config) => {
  const jwt = await getFreshKioskJwt(askPin);
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

apiOrder.interceptors.response.use(
  (r) => r,
  async (err) => {
    // si el token caducó y no se pudo refrescar, volvemos a pedir PIN una vez
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original: any = err.config || {};
    if (err.response?.status === 401 && !original.__retried) {
      try {
        original.__retried = true;
        const jwt = await getFreshKioskJwt(askPin);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${jwt}`;
        return axios(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default apiOrder;

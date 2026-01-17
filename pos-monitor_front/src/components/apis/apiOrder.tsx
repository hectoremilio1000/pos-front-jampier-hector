// /src/components/apis/apiOrder.ts
import axios from "axios";

const apiOrder = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER,
});

apiOrder.interceptors.request.use((config) => {
  const kioskToken = sessionStorage.getItem("kiosk_token");
  if (kioskToken) {
    // Opción A (la que venimos usando):
    config.headers["x-kiosk-token"] = kioskToken;

    // Opción B (si prefieres Authorization):
    // config.headers.Authorization = `Kiosk ${kioskToken}`;
  }
  return config;
});

export default apiOrder;

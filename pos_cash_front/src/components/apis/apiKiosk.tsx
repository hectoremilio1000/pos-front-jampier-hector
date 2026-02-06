// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/apis/apiKiosk.tsx
import axios from "axios";

const apiKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_AUTH, // ej: http://localhost:3333/api
});

apiKiosk.interceptors.request.use((config) => {
  const jwt = sessionStorage.getItem("kiosk_jwt");
  if (jwt) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${jwt}`;
  }
  return config;
});

export default apiKiosk;

// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/apis/apiCash.tsx
import axios from "axios";

const apiCash = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH,
});

apiCash.interceptors.request.use((config) => {
  const jwt = sessionStorage.getItem("access_jwt"); // ← JWT corto
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

export default apiCash;

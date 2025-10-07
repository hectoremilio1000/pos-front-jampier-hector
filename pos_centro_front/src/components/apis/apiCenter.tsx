// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/apis/apiCenter.tsx
import axios from "axios";

const apiCenter = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CENTER, // ej: http://localhost:3336/api/
});

// Bearer del SA (reutiliza el token del AuthProvider)
apiCenter.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiCenter;

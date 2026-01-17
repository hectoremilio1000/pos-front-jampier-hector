import axios from "axios";

const apiOrderAuth = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER,
});

apiOrderAuth.interceptors.request.use((config) => {
  const t = sessionStorage.getItem("token"); // ← admin_session_token
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default apiOrderAuth;

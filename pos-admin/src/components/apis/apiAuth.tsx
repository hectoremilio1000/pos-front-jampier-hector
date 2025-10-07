import axios from "axios";

const apiAuth = axios.create({
  baseURL: import.meta.env.VITE_API_URL_AUTH,
});

apiAuth.interceptors.request.use((config) => {
  const t = sessionStorage.getItem("token"); // ← admin_session_token
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default apiAuth;

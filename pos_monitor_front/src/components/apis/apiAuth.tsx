import axios from "axios";

const apiAuth = axios.create({
  baseURL: import.meta.env.VITE_API_URL_AUTH,
});

apiAuth.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiAuth;

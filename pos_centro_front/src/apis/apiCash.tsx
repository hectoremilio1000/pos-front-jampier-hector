import axios from "axios";

const apiCash = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH,
});

apiCash.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiCash;

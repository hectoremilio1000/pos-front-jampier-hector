import axios from "axios";

const apiOrder = axios.create({
  baseURL: import.meta.env.VITE_API_URL_ORDER,
});

apiOrder.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiOrder;

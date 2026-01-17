import axios from "axios";

const apiOrderPublic = axios.create({
  baseURL: import.meta.env.VITE_ORDER_PUBLIC_BASE_URL || "/pos-order", // AJUSTA
  timeout: 15000,
});

export default apiOrderPublic;

import axios from "axios";

const apiAuthPublic = axios.create({
  baseURL: import.meta.env.VITE_AUTH_PUBLIC_BASE_URL || "/pos-auth", // AJUSTA
  timeout: 15000,
});

export default apiAuthPublic;

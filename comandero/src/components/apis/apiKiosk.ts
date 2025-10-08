import axios from "axios";

const apiKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_AUTH, // ej: http://localhost:3333/api
});

export default apiKiosk;

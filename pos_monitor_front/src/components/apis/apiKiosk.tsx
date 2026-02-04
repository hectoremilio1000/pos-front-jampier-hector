// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/apis/apiKiosk.tsx
import axios from "axios";

const apiKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_AUTH, // ej: http://localhost:3333/api
});

export default apiKiosk;

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

export async function getPairingCode(restaurantId: number) {
  const { data } = await apiAuth.get(`/restaurants/${restaurantId}/pairing`);
  return data as {
    restaurantId: number;
    pairingCode: string;
    rotatedAt?: string | null;
  };
}

export async function rotatePairingCode(restaurantId: number) {
  const { data } = await apiAuth.post(
    `/restaurants/${restaurantId}/pairing/rotate`
  );
  return data as {
    restaurantId: number;
    pairingCode: string;
    rotatedAt?: string | null;
  };
}

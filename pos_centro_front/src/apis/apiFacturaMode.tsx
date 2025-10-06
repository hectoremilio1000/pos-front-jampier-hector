import apiAuth from "./apiAuth";

export const getRestaurantMode = (id: number | string) =>
  apiAuth.get(`/restaurants/${id}/facturapi/mode`);

export const setRestaurantMode = (id: number | string, mode: "test" | "live") =>
  apiAuth.put(`/restaurants/${id}/facturapi/mode`, { mode });

export const registerLiveSecret = (id: number | string, secret: string) =>
  apiAuth.post(`/restaurants/${id}/facturapi/live-secret`, { secret });

// 👇 NUEVO: renovar en Facturapi y guardar en DB
export const renewLiveSecret = (id: number | string) =>
  apiAuth.post(`/restaurants/${id}/facturapi/live-secret/renew`);

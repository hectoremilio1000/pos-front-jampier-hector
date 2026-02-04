import apiAuth from "@/components/apis/apiAuth";

export const getRestaurantMode = (restaurantId: number | string) =>
  apiAuth.get(`/restaurants/${restaurantId}/facturapi/mode`); // { mode: 'test'|'live', live_enabled: boolean }

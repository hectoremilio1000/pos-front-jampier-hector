import apiAuth from "@/components/apis/apiAuth";

export const listCustomers = (restaurantId: number | string, params: any) =>
  apiAuth.get(`/restaurants/${restaurantId}/customers`, { params });

export const createCustomer = (
  restaurantId: number | string,
  customer: any,
  mode?: "test" | "live"
) => apiAuth.post(`/restaurants/${restaurantId}/customers`, { customer, mode });

export const updateCustomer = (
  restaurantId: number | string,
  customerId: string,
  customer: any,
  mode?: "test" | "live"
) =>
  apiAuth.put(`/restaurants/${restaurantId}/customers/${customerId}`, {
    customer,
    mode,
  });

export const deleteCustomer = (
  restaurantId: number | string,
  customerId: string,
  params?: any
) =>
  apiAuth.delete(`/restaurants/${restaurantId}/customers/${customerId}`, {
    params,
  });

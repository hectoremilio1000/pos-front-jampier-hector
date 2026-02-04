import apiAuth from "@/components/apis/apiAuth";

export const listInvoices = (restaurantId: number | string, params: any) =>
  apiAuth.get(`/restaurants/${restaurantId}/invoices`, { params });

export const createInvoice = (restaurantId: number | string, payload: any) =>
  apiAuth.post(`/restaurants/${restaurantId}/invoices`, payload);

export const emailInvoice = (
  restaurantId: number | string,
  invoiceId: string,
  body: { email?: string; mode?: "test" | "live" }
) =>
  apiAuth.post(
    `/restaurants/${restaurantId}/invoices/${invoiceId}/email`,
    body
  );

// 👇 NUEVO: descarga blob (pdf|xml|zip)
export const downloadInvoice = (
  restaurantId: number | string,
  invoiceId: string,
  format: "pdf" | "xml" | "zip",
  params: any
) =>
  apiAuth.get(`/restaurants/${restaurantId}/invoices/${invoiceId}/${format}`, {
    params,
    responseType: "blob",
  });

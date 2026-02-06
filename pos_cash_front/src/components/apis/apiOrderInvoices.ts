import apiOrderKiosk from "@/components/apis/apiOrderKiosk";

export const getInvoiceByOrder = (orderId: number | string) =>
  apiOrderKiosk.get(`/orders/${orderId}/invoice`);

export const createInvoiceForOrder = (
  orderId: number | string,
  body: {
    customer: {
      legalName: string;
      taxId: string;
      taxSystem: string;
      email?: string;
      zip: string;
    };
    cfdiUse?: string;
    paymentForm?: string;
    amountBase?: number;
    amountTax?: number;
    amountTotal?: number;
  }
) => apiOrderKiosk.post(`/orders/${orderId}/invoice`, body);

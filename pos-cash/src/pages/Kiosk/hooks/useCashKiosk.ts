// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/hooks/useCashKiosk.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import apiOrderKiosk from "@/components/apis/apiOrderKiosk";

function parseJwt<T = any>(token: string | null): T | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export type CashOrderItem = {
  id: number;
  name?: string;
  qty: number;
  unitPrice: number;
  total?: number;
};

export type CashOrder = {
  id: number;
  tableName?: string | null;
  areaName?: string | null;
  persons?: number;
  total?: number;
  items: CashOrderItem[];
};

export type KPIs = {
  salesCash: number;
  salesCard: number;
  salesTotal: number;
};

export function useCashKiosk() {
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [shiftId, setShiftId] = useState<string | null>(
    sessionStorage.getItem("cash_shift_id")
  );
  const [orders, setOrders] = useState<CashOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({
    salesCash: 0,
    salesCard: 0,
    salesTotal: 0,
  });

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const getContext = useCallback(() => {
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const payload = parseJwt<{ restaurantId?: number }>(jwt);
    const restaurantId = payload?.restaurantId;
    const stationCode = sessionStorage.getItem("cash_station_code") || "";
    return { restaurantId, stationCode };
  }, []);

  const checkCurrentShift = useCallback(async () => {
    try {
      setLoading(true);
      const { restaurantId, stationCode } = getContext();
      if (!restaurantId || !stationCode) {
        sessionStorage.removeItem("cash_shift_id");
        setShiftId(null);
        return;
      }
      const { data } = await apiCashKiosk.get("/shifts/current", {
        params: { restaurantId, stationCode },
        validateStatus: () => true,
      });
      if (data?.id) {
        const id = String(data.id);
        sessionStorage.setItem("cash_shift_id", id);
        setShiftId(id);
      } else {
        sessionStorage.removeItem("cash_shift_id");
        setShiftId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [getContext]);

  const openShift = useCallback(async () => {
    const { restaurantId, stationCode } = getContext();
    if (!restaurantId || !stationCode) {
      return message.error(
        "Falta restaurantId/stationCode. Reempareja el dispositivo."
      );
    }
    try {
      setLoading(true);
      const { data } = await apiCashKiosk.post("/shifts/open", {
        restaurantId,
        stationCode,
        openingCash: Number(openingCash || 0),
      });
      const id = String(data?.id);
      sessionStorage.setItem("cash_shift_id", id);
      setShiftId(id);
      message.success("Turno abierto");
      await fetchOrders();
      await fetchKPIs();
    } catch (e: any) {
      message.error(
        String(e?.response?.data?.error || "No se pudo abrir el turno")
      );
    } finally {
      setLoading(false);
    }
  }, [getContext, openingCash]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // según tu OrdersController.index, si requiere filtro pásalo aquí (p.ej. { params:{ status:'OPEN' } })
      const { data } = await apiOrderKiosk.get<CashOrder[]>("/orders", {
        validateStatus: () => true,
        // params: { status: 'OPEN' }, // <- descomenta si lo usas así en ORDER
      });
      setOrders((data || []).map((o) => ({ ...o, items: o.items || [] })));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKPIs = useCallback(async () => {
    const sid = sessionStorage.getItem("cash_shift_id");
    if (!sid) {
      setKpis({ salesCash: 0, salesCard: 0, salesTotal: 0 });
      return;
    }
    try {
      const { data } = await apiCashKiosk.get(`/metrics/shift/${sid}`, {
        validateStatus: () => true,
      });
      const cash = Number(data?.sales?.cash || 0);
      const card = Number(data?.sales?.card || 0);
      setKpis({ salesCash: cash, salesCard: card, salesTotal: cash + card });
    } catch {
      setKpis({ salesCash: 0, salesCard: 0, salesTotal: 0 });
    }
  }, []);

  const fetchOrderById = useCallback(async (orderId: number) => {
    try {
      setLoadingDetail(true);
      const { data } = await apiOrderKiosk.get(`/orders/${orderId}`, {
        validateStatus: () => true,
      });
      if (!data) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...data,
                items: (data.items || []).map((it: any) => {
                  const productId = it.productId ?? it.product_id;
                  const name =
                    it.name ??
                    it.product_name ?? // 👈 si backend ya lo manda
                    it.product?.name ?? // 👈 si viene anidado
                    (productId != null ? `#${productId}` : `#${it.id}`);

                  return {
                    id: it.id,
                    productId,
                    name,
                    qty: Number(it.qty ?? it.quantity ?? 0),
                    unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
                    total: it.total != null ? Number(it.total) : undefined,
                  };
                }),
              }
            : o
        )
      );
      setSelectedOrderId(orderId);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const payOrder = useCallback(
    async (orderId: number, payload: any) => {
      await apiOrderKiosk.post(`/orders/${orderId}/pay`, payload); // 👈 ORDER
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSelectedOrderId(null);
      await fetchKPIs();
    },
    [fetchKPIs]
  );

  const recordCashMovement = useCallback(
    async (type: "IN" | "OUT", amount: number, reason: string) => {
      await apiCashKiosk.post("/cash-movements", { type, amount, reason });
      await fetchKPIs();
      message.success("Movimiento registrado");
    },
    [fetchKPIs]
  );

  useEffect(() => {
    (async () => {
      await checkCurrentShift();
      if (sessionStorage.getItem("cash_shift_id")) {
        await fetchOrders();
        await fetchKPIs();
      }
    })();
  }, [checkCurrentShift, fetchOrders, fetchKPIs]);

  return {
    // state
    loading,
    setLoading,
    openingCash,
    setOpeningCash,
    shiftId,
    setShiftId,
    orders,
    setOrders,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    kpis,

    // actions
    checkCurrentShift,
    openShift,
    fetchOrders,
    fetchKPIs,
    payOrder,
    recordCashMovement,
    fetchOrderById,
  };
}

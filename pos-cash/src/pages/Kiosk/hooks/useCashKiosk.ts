// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/hooks/useCashKiosk.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import apiOrderKiosk from "@/components/apis/apiOrderKiosk";

import { Transmit } from "@adonisjs/transmit-client";

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
export type Product = {
  id: number;
  code?: string;
  name?: string;
};

export type CashOrderItem = {
  id: number;
  productId?: number;
  product?: Product; // <- preferimos product.name
  name?: string; // <- opcional (si el backend lo manda plano)
  qty: number;
  unitPrice: number;
  taxRate: number;
  basePrice: number;
  total?: number;

  // FLAGS para compuestos / modificadores
  isModifier?: boolean | null;
  isCompositeProductMain?: boolean | null;
  compositeProductId?: number | null;
};

export type Area = {
  id: number;
  name?: string;
};

export type Waiter = {
  id: number;
  fullName: string;
};
export type Restaurant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  rfc: string;
  address_line1: string;
};

export type CashOrder = {
  id: number;
  tableName?: string | null;
  area_id: number;
  area: Area;
  areaName?: string | null;
  persons?: number;
  total?: number;
  items: CashOrderItem[];
  waiter?: Waiter;
  restaurant?: Restaurant;
  createdAt?: Date;
};

export type KPIs = {
  salesCash: number;
  salesCard: number;
  salesTotal: number;
};
type CashStation = {
  id: number;
  mode: number;
  name: number;
  code: number;
};

export function useCashKiosk() {
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [shiftId, setShiftId] = useState<string | null>(
    sessionStorage.getItem("cash_shift_id")
  );
  const [stationId, setStationId] = useState<string | null>(
    sessionStorage.getItem("cash_station_id")
  );
  const [stationCurrent, setStationCurrent] = useState<CashStation | null>();
  const [sessionId, setSessionId] = useState<string | null>(
    sessionStorage.getItem("cash_session_id")
  );

  const [orders, setOrders] = useState<CashOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({
    salesCash: 0,
    salesCard: 0,
    salesTotal: 0,
  });

  const transmitRef = useRef<Transmit | null>(null);
  const subCleanupRef = useRef<() => void>(() => {});

  function getRestaurantIdFromSession(): number {
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const payload = parseJwt<{ restaurantId?: number }>(jwt);
    return Number(payload?.restaurantId ?? 0);
  }

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
  const fetchCashStation = async () => {
    try {
      const res = await apiCashKiosk.get(`/cash/cash_stations/${stationId}`);
      setStationCurrent(res.data);
    } catch (error) {
      message.error(
        "ocurrio un error al traer la informacion de la caja, vuelva a emparejar e iniciar session"
      );
    }
  };
  useEffect(() => {
    fetchCashStation();
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
      if (data.error) {
        message.error("No se abrio ningun turno");
        sessionStorage.removeItem("cash_shift_id");
        setShiftId(null);
        setSessionId(null);
      } else {
        if (data.shift?.id) {
          sessionStorage.setItem("cash_shift_id", data.shift.id);
          setShiftId(data.shift.id);
        }
        if (data.session?.id) {
          sessionStorage.setItem("cash_session_id", data.session.id);
          setSessionId(data.session.id);
        }
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

      // Respuesta: { shift:{id,...}, session:{id,...} }
      const sid = data?.shift?.id ? String(data.shift.id) : null;
      const sess = data?.session?.id ? String(data.session.id) : null;

      if (sid) {
        sessionStorage.setItem("cash_shift_id", sid);
        setShiftId(sid);
      }
      if (sess) {
        sessionStorage.setItem("cash_session_id", sess);
        setSessionId(sess);
      }

      message.success("Caja abierta");
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
      });
      setOrders(
        (data || []).map((o: any) => ({
          ...o,
          items: (o.items || []).map((it: any) => ({
            id: Number(it.id),
            productId: it.productId ?? it.product_id ?? undefined,
            product: it.product
              ? {
                  id: Number(it.product.id),
                  code: it.product.code,
                  name: it.product.name,
                }
              : undefined,
            name: it.name ?? it.product_name, // opcional si llega
            qty: Number(it.qty ?? it.quantity ?? 0),
            unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
            basePrice: Number(it.basePrice ?? it.base_price ?? 0),
            taxRate: Number(it.taxRate ?? it.tax_rate ?? 0),
            total: it.total != null ? Number(it.total) : undefined,
            isModifier: !!it.isModifier,
            isCompositeProductMain: !!it.isCompositeProductMain,
            compositeProductId: it.compositeProductId ?? null,
          })),
        }))
      );
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
                items: (data.items || []).map((it: any) => ({
                  id: Number(it.id),
                  productId: it.productId ?? it.product_id ?? undefined,
                  product: it.product
                    ? {
                        id: Number(it.product.id),
                        code: it.product.code,
                        name: it.product.name,
                      }
                    : undefined,
                  name: it.name ?? it.product_name, // opcional
                  qty: Number(it.qty ?? it.quantity ?? 0),
                  unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
                  basePrice: Number(it.basePrice ?? it.base_price ?? 0),
                  taxRate: Number(it.taxRate ?? it.tax_rate ?? 0),
                  total: it.total != null ? Number(it.total) : undefined,
                  isModifier: !!it.isModifier,
                  isCompositeProductMain: !!it.isCompositeProductMain,
                  compositeProductId: it.compositeProductId ?? null,
                })),
              }
            : o
        )
      );
      setSelectedOrderId(orderId);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // const onOrdersEvent = useCallback(
  //   async (msg: any) => {
  //     if (!msg || typeof msg !== "object") return;

  //     if (msg.type === "order_created" && msg.order) {
  //       const o = msg.order;
  //       // mapea al tipo CashOrder
  //       const newOrder: CashOrder = {
  //         id: Number(o.id),
  //         tableName: o.tableName ?? null,
  //         area_id: Number(o.area_id ?? 0),
  //         area: o.area || {
  //           id: Number(o.area_id ?? 0),
  //           name: o.areaName ?? "–",
  //         },
  //         persons: Number(o.persons ?? 0),
  //         items: [], // al abrir, usualmente vacío
  //         total: Number(o.total ?? 0),
  //       };

  //       // 1) evita duplicados
  //       setOrders((prev) => {
  //         if (prev.some((x) => x.id === newOrder.id)) return prev;
  //         return [newOrder, ...prev];
  //       });

  //       // 2) (opcional) sincronizar detalle por id para tener items y totales exactos
  //       try {
  //         await fetchOrderById(newOrder.id);
  //       } catch {}
  //     }

  //     // En el futuro puedes manejar: 'order_changed', 'order_closed', etc.
  //   },
  //   [fetchOrderById, setOrders]
  // );

  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;

      // 👉 ORDER CREATED
      if (msg.type === "order_created" && msg.order) {
        const o = msg.order;
        const newOrder: CashOrder = {
          id: Number(o.id),
          tableName: o.tableName ?? null,
          area_id: Number(o.area_id ?? 0),
          area: o.area || {
            id: Number(o.area_id ?? 0),
            name: o.areaName ?? "–",
          },
          persons: Number(o.persons ?? 0),
          items: [],
          total: Number(o.total ?? 0),
        };

        setOrders((prev) => {
          if (prev.some((x) => x.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });

        try {
          await fetchOrderById(newOrder.id);
        } catch {}
        return;
      }

      // 👉 ORDER CLOSED (emitido por /orders/:id/pay)
      if (msg.type === "order_closed") {
        // el controlador envía orderId; si no, intenta msg.order.id
        const closedId = Number(
          msg.orderId ?? (msg.order && msg.order.id) ?? 0
        );
        if (!closedId) return;

        // 1) saca la orden de la lista
        setOrders((prev) => prev.filter((o) => o.id !== closedId));

        // 2) si estaba seleccionada, limpia la selección
        setSelectedOrderId((current) =>
          current === closedId ? null : current
        );

        // 3) refresca KPIs (caja)
        try {
          await fetchKPIs();
        } catch {}

        return;
      }

      // (opcional) aquí podrías manejar: 'order_changed', etc.
    },
    [fetchOrderById, setOrders, setSelectedOrderId, fetchKPIs]
  );

  useEffect(() => {
    // si no hay shift aún, igual podemos ir montando el stream
    const rid = getRestaurantIdFromSession();
    if (!rid) return;

    // instancia única de Transmit
    if (!transmitRef.current) {
      transmitRef.current = new Transmit({
        baseUrl: (apiOrderKiosk.defaults.baseURL as string) || "/api",
        // el POST /__transmit/subscribe sí lleva Bearer
        beforeSubscribe: (request) => {
          // En Transmit, 'request' puede ser Request o RequestInit según versión
          const anyReq = request as any;

          // Caso 1: Request (propiedad headers solo getter) → usa .set(...)
          if (anyReq.headers && typeof anyReq.headers.set === "function") {
            const token = sessionStorage.getItem("kiosk_jwt") || "";
            if (token) anyReq.headers.set("Authorization", `Bearer ${token}`);
            const sid = sessionStorage.getItem("cash_shift_id") || "";
            if (sid) anyReq.headers.set("X-Shift-Id", sid);
            return;
          }

          // Caso 2: RequestInit → crea Headers y re-asigna
          const headers = new Headers((request as RequestInit).headers || {});
          const token = sessionStorage.getItem("kiosk_jwt") || "";
          if (token) headers.set("Authorization", `Bearer ${token}`);
          const sid = sessionStorage.getItem("cash_shift_id") || "";
          if (sid) headers.set("X-Shift-Id", sid);
          (request as RequestInit).headers = headers;
        },

        beforeUnsubscribe: (request) => {
          const anyReq = request as any;
          if (anyReq.headers && typeof anyReq.headers.set === "function") {
            const token = sessionStorage.getItem("kiosk_jwt") || "";
            if (token) anyReq.headers.set("Authorization", `Bearer ${token}`);
            return;
          }
          const headers = new Headers((request as RequestInit).headers || {});
          const token = sessionStorage.getItem("kiosk_jwt") || "";
          if (token) headers.set("Authorization", `Bearer ${token}`);
          (request as RequestInit).headers = headers;
        },

        maxReconnectAttempts: 10,
        onSubscribeFailed: (res) => {
          console.error("Transmit subscribe failed", res?.status);
        },
      });
    }

    const sub = transmitRef.current.subscription(`restaurants/${rid}/orders`);
    const off = sub.onMessage(onOrdersEvent);
    sub.create().catch((e) => console.error("Transmit create error", e));

    subCleanupRef.current = () => {
      try {
        off && off();
      } catch {}
      try {
        sub.delete();
      } catch {}
    };

    return () => {
      try {
        subCleanupRef.current();
      } catch {}
    };
  }, [onOrdersEvent]);

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
      if (sessionStorage.getItem("cash_session_id")) {
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
    sessionId,
    setSessionId, // 👈 nuevo
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
    // current station
    stationCurrent,
  };
}

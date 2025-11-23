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
  const [restaurantId, setRestaurantId] = useState<string | null>(
    sessionStorage.getItem("restaurantId")
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

  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;

      // 👉 ORDER CREATED
      if (msg.type === "order_created" && msg.order) {
        const o = msg.order;

        // 🔧 Normaliza area: a veces llega como string JSON (caso alias)
        const parsedArea =
          typeof o.area === "string"
            ? (() => {
                try {
                  return JSON.parse(o.area);
                } catch {
                  return null;
                }
              })()
            : o.area;

        const areaObj = (parsedArea && typeof parsedArea === "object"
          ? parsedArea
          : null) || {
          id: Number(o.area_id ?? 0),
          name: o.areaName ?? "–",
        };

        const newOrder: CashOrder = {
          id: Number(o.id),
          tableName: o.tableName ?? null,
          area_id: Number(o.area_id ?? areaObj.id ?? 0),
          area: areaObj,
          areaName: areaObj?.name ?? o.areaName ?? "–",
          persons: Number(o.persons ?? 0),
          items: [],
          total: Number(o.total ?? 0),
        };

        setOrders((prev) => {
          if (prev.some((x) => x.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });

        return;
      }

      // 👉 ORDER CHANGED (items nuevos, totales actualizados, movimiento de mesa/alias)
      if (msg.type === "order_changed") {
        const changedId = Number(
          msg.orderId ?? (msg.order && msg.order.id) ?? 0
        );
        if (!changedId) return;

        const incomingItemsRaw: any[] = Array.isArray(msg.items)
          ? msg.items
          : [];
        const normalizeItem = (it: any): CashOrderItem => {
          const productObj =
            it.product && typeof it.product === "object"
              ? {
                  id: Number(it.product.id ?? it.productId ?? 0),
                  name:
                    it.product.name ??
                    it.name ??
                    (typeof it.productId !== "undefined"
                      ? String(it.productId)
                      : ""),
                }
              : undefined;

          return {
            id: Number(it.id),
            productId:
              typeof it.productId !== "undefined" && it.productId !== null
                ? Number(it.productId)
                : productObj?.id,
            product: productObj,
            name: it.name ?? productObj?.name,
            qty: Number(it.qty ?? 0),
            unitPrice: Number(it.unitPrice ?? 0),
            basePrice: Number(
              it.basePrice ?? it.base_price ?? it.unitPrice ?? 0
            ),
            taxRate: Number(it.taxRate ?? it.tax_rate ?? 0),
            total:
              typeof it.total !== "undefined" ? Number(it.total) : undefined,
            isModifier: !!it.isModifier,
            isCompositeProductMain: !!it.isCompositeProductMain,
            compositeProductId:
              typeof it.compositeProductId !== "undefined" &&
              it.compositeProductId !== null
                ? Number(it.compositeProductId)
                : null,
          };
        };

        const incomingItems: CashOrderItem[] = incomingItemsRaw
          .filter((r) => r && typeof r === "object" && Number(r.id))
          .map(normalizeItem);

        const newTotals =
          msg.totals && typeof msg.totals === "object" ? msg.totals : null;

        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== changedId) return o;

            // ---- UPSERT de items (agregar si no existe, actualizar si ya existe) ----
            const byId = new Map<number, CashOrderItem>();
            // conserva los existentes por defecto
            for (const e of o.items ?? []) byId.set(e.id, e);

            for (const ni of incomingItems) {
              const existing = byId.get(ni.id);
              // mezcla: incoming pisa campos del existente (status/qty/precio/total/nombre)
              byId.set(ni.id, { ...(existing || {}), ...ni });
            }

            // Mantener orden: primero los existentes en su orden original, luego los nuevos
            const existingIds = new Set((o.items ?? []).map((e) => e.id));
            const merged: CashOrderItem[] = [
              ...(o.items ?? []).map((e) => byId.get(e.id)!),
              ...incomingItems.filter((ni) => !existingIds.has(ni.id)),
            ];

            // ---- Movimiento de mesa/alias (si viene msg.move) ----
            let nextTableName = o.tableName ?? null;
            let nextAreaId = o.area_id;
            let nextArea = o.area;
            let nextAreaName = o.areaName ?? nextArea?.name ?? "–";

            const mv = msg.move;
            if (mv && typeof mv === "object") {
              if (typeof mv.toAlias === "string") {
                nextTableName = mv.toAlias;
              }
              if (Number.isFinite(mv.toTableId)) {
                // Al moverse a una mesa real, limpiamos alias.
                nextTableName = null;
              }
              if (Number.isFinite(mv.toAreaId)) {
                nextAreaId = Number(mv.toAreaId);
                // No conocemos el nombre de área aquí; lo preservamos si coincide o dejamos "–".
                // (Opcional: un GET /orders/:id podría refrescar, pero evitamos red)
                if (!nextArea || nextArea.id !== nextAreaId) {
                  nextArea = {
                    id: nextAreaId,
                    name: nextAreaName || "–",
                  } as any;
                }
              }
            }

            return {
              ...o,
              items: merged,
              total:
                newTotals && Number.isFinite(Number(newTotals.total))
                  ? Number(newTotals.total)
                  : o.total,
              tableName: nextTableName,
              area_id: nextAreaId,
              area: nextArea,
              areaName: nextAreaName,
            };
          })
        );

        return;
      }

      // 👉 ORDER CLOSED (emitido por /orders/:id/pay o /orders/:id/close)
      if (msg.type === "order_closed") {
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
    restaurantId,
    stationId,
  };
}

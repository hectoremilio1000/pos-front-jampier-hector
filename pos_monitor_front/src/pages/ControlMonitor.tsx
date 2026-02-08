import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Typography, message, Table, Tag } from "antd";

import type { ColumnsType } from "antd/es/table";
import { useShift } from "@/context/ShiftContext";
import apiOrder from "@/components/apis/apiOrder";
import HeaderStatus from "@/components/Kiosk/HeaderStatus";
import { useNavigate } from "react-router-dom";
import { kioskLogoutOperator } from "@/components/Kiosk/session";
import { Transmit } from "@adonisjs/transmit-client";

const CASH_API = import.meta.env.VITE_API_URL_CASH; // p.ej. http://localhost:3335/api
const { Title } = Typography;

type Product = {
  id: number;
  code: string;
  name: string;
};

type OrderItem = {
  id: number;
  product?: Product;
  qty: number;
  notes?: string | null;
  status?: "pending" | "sent" | "fire" | "prepared" | "cancelled";
  course?: number;
  routeAreaId?: number | null;
  isModifier?: boolean | null;
  isCompositeProductMain?: boolean | null;
  compositeProductId?: number | null;
  createdAt?: string;
  created_at?: string; // ✅ fallback si tu API manda snake_case
};

type Order = {
  id: number;
  tableName?: string | null; // mesa
  created_at?: string;
  items: OrderItem[];
};

type Row = {
  key: string;
  orderId: number;
  orderNumber: number; // 1..N dentro del arreglo orders
  tableName: string;
  minutes: number;
  qty: number;
  productDisplay: string; // principal + líneas con > modificadores
  notes: string;
  mainItemId: number; // id del principal (o del propio item si no es compuesto)
  allItemIds: number[]; // para payload de finalizar
  status?: string;
  itemTs?: string;
  course?: number;
};
function getRestaurantIdFromJwt(): number {
  try {
    const t = sessionStorage.getItem("kiosk_restaurant_id") || "";
    console.log(t);
    return Number(t);
  } catch {
    return 0;
  }
}
export function ControlMonitor() {
  const { shiftId, setShiftId, clearShift } = useShift();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const stationCode = sessionStorage.getItem("monitor_station_code");

  const token = sessionStorage.getItem("kiosk_token");
  const navigate = useNavigate();

  const [minuteTick, setMinuteTick] = useState(0);

  // ✅ Hace que "Minutos" se recalcule cada 60s aunque no cambien las órdenes
  useEffect(() => {
    const id = setInterval(() => setMinuteTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  function cerrarSesion() {
    kioskLogoutOperator(); // borra solo kiosk_jwt y exp
    message.success("Sesión cerrada");
    navigate("/", { replace: true }); // ← regresa al login correcto
  }
  function minutesSince(ts?: string) {
    if (!ts) return 0;
    const ms = Date.now() - new Date(ts).getTime();
    return Math.max(0, Math.floor(ms / 60000));
  }
  function formatElapsed(ts?: string) {
    if (!ts) return "--:--";
    const start = new Date(ts).getTime();
    if (!Number.isFinite(start)) return "--:--";
    const totalSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${minutes}:${pad(seconds)}`;
  }

  async function fetchCurrentShiftId() {
    const token = sessionStorage.getItem("kiosk_token") || "";
    // (usa tu ruta real en cash: /monitor/shifts/current o /shifts/current)
    const r = await fetch(`${CASH_API}/monitor/shifts/current`, {
      headers: { "x-kiosk-token": token },
    });
    if (!r.ok) {
      setShiftId(null);
      throw new Error("No hay turno abierto");
    }
    const data = await r.json(); // { id }
    setShiftId(Number(data.id));
    return Number(data.id);
  }
  // Opcional: tipa la respuesta si quieres
  type OrdersResponse = { orders: Order[] };

  const fetchOrdersByShift = useCallback(async (id: number) => {
    try {
      const { data } = await apiOrder.get<OrdersResponse>("/monitor/orders", {
        params: { shiftId: id },
      });
      setOrders(data?.orders ?? []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudieron cargar órdenes";
      throw new Error(msg);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const id = shiftId ?? (await fetchCurrentShiftId());
      await fetchOrdersByShift(id);
    } catch (e: any) {
      setOrders([]);
      message.warning(e?.message || "No hay turno abierto");
    } finally {
      setLoading(false);
    }
  }, [shiftId, fetchOrdersByShift]);

  // Refresco manual con botón (si quieres automático, agrega useEffect con setInterval)
  useEffect(() => {
    loadAll();
    // const t = setInterval(loadAll, 10000);
    // return () => clearInterval(t);
  }, []); // eslint-disable-line

  const transmitRef = useRef<Transmit | null>(null);
  const subCleanupRef = useRef<() => void>(() => {});

  /** handler central de eventos del canal */
  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "shift_closed") {
        clearShift();
        setOrders([]);
        message.info("Turno cerrado. Esperando un nuevo turno.");
        return;
      }

      if (msg.type === "order_changed") {
        try {
          await loadAll(); // ✅ usa shiftId real o lo vuelve a pedir
        } catch (e) {
          console.error("Error al refrescar órdenes (order_changed):", e);
        }
        return;
      }

      if (msg.type === "order_closed") {
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        setOrders((prev) => prev.filter((c) => c.id !== id));

        try {
          await loadAll(); // ✅ re-sync completo
        } catch {}
      }
    },
    [loadAll, clearShift]
  );

  useEffect(() => {
    if (!token) return;

    if (!transmitRef.current) {
      transmitRef.current = new Transmit({
        baseUrl: `${apiOrder.defaults.baseURL}/kiosk` || "/api/kiosk",
        beforeSubscribe: (request) => {
          const anyReq = request as any;
          if (anyReq.headers && typeof anyReq.headers.set === "function") {
            const token = sessionStorage.getItem("kiosk_token") || "";
            if (token) anyReq.headers.set("Authorization", `Bearer ${token}`);
          } else {
            const headers = new Headers((request as RequestInit).headers || {});
            const token = sessionStorage.getItem("kiosk_token") || "";
            if (token) headers.set("Authorization", `Bearer ${token}`);
            // OJO: si tu Transmit espera return en RequestInit, aquí habría que retornarlo.
          }
        },
        maxReconnectAttempts: 10,
        onSubscribeFailed: (res) => {
          console.error("Transmit subscribe failed", res?.status);
        },
      });
    }

    const rid = getRestaurantIdFromJwt();
    if (!rid) return;

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
  }, [token, onOrdersEvent]);

  /**
   * Agrupa ítems por:
   *  - Si item.isCompositeProductMain === true => renglón único con sus modificadores (mismo compositeProductId y isModifier=true)
   *  - Si item.isModifier === true => se ignora aquí (lo pinta el principal)
   *  - Caso normal => renglón propio
   */
  const data: Row[] = useMemo(() => {
    // índice humano (1..N) por orden
    const orderNumberMap = new Map<number, number>();
    orders.forEach((o, idx) => orderNumberMap.set(o.id, idx + 1));

    const rows: Row[] = [];
    const consumed = new Set<number>(); // ids ya agrupados

    for (const o of orders) {
      const orderNum = orderNumberMap.get(o.id) ?? 0;
      const tableName = o.tableName || "—";

      for (const it of o.items || []) {
        if (consumed.has(it.id)) continue;

        const isMain = !!it.isCompositeProductMain;
        const isMod = !!it.isModifier;
        const compositeId = it.compositeProductId ?? null;

        // ✅ timestamp robusto (camelCase o snake_case)
        const itemTs = it.createdAt ?? (it as any).created_at ?? it.created_at;
        const itemTsStr = itemTs ? String(itemTs) : undefined;

        if (isMain && compositeId) {
          const modifiers = o.items.filter(
            (x) =>
              x.id !== it.id &&
              !!x.isModifier &&
              (x.compositeProductId ?? null) === compositeId
          );

          consumed.add(it.id);
          modifiers.forEach((m) => consumed.add(m.id));

          const mainName = it.product?.name ?? "(Producto)";
          const modsNames = modifiers
            .map((m) => m.product?.name)
            .filter(Boolean) as string[];

          const productDisplay =
            mainName +
            (modsNames.length
              ? "\n" + modsNames.map((n) => `> ${n}`).join("\n")
              : "");

          rows.push({
            key: `${o.id}-main-${it.id}`,
            orderId: o.id,
            orderNumber: orderNum,
            tableName,
            minutes: minutesSince(itemTs),
            qty: it.qty ?? 1,
            productDisplay,
            notes: it.notes ?? "",
            mainItemId: it.id,
            allItemIds: [it.id, ...modifiers.map((m) => m.id)],
            status: it.status,
            itemTs: itemTsStr,
            course: it.course ?? 1,
          });
        } else if (isMod && compositeId) {
          continue;
        } else {
          consumed.add(it.id);
          rows.push({
            key: `${o.id}-single-${it.id}`,
            orderId: o.id,
            orderNumber: orderNum,
            tableName,
            minutes: minutesSince(itemTs),
            qty: it.qty ?? 1,
            productDisplay: it.product?.name ?? "(Producto)",
            notes: it.notes ?? "",
            mainItemId: it.id,
            allItemIds: [it.id],
            status: it.status,
            itemTs: itemTsStr,
            course: it.course ?? 1,
          });
        }
      }
    }

    return rows;
  }, [orders, minuteTick]); // ✅ importante

  const columns: ColumnsType<Row> = [
    {
      title: "N° Orden",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 90,
      align: "center",
      sorter: (a, b) => a.orderNumber - b.orderNumber,
    },
    {
      title: "Mesa",
      dataIndex: "tableName",
      key: "tableName",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (s?: Row["status"]) => {
        const status = (s || "pending") as string;

        const labelMap: Record<string, string> = {
          pending: "Pendiente",
          sent: "Enviado",
          fire: "🔥 FIRE",
          prepared: "Listo",
          cancelled: "Cancelado",
        };

        const colorMap: Record<string, any> = {
          pending: "default",
          sent: "processing",
          fire: "error",
          prepared: "success",
          cancelled: "default",
        };

        return (
          <Tag color={colorMap[status] ?? "default"}>
            {labelMap[status] ?? status}
          </Tag>
        );
      },
    },

    {
      title: "Tiempo transcurrido",
      dataIndex: "minutes",
      key: "minutes",
      width: 140,
      align: "center",
      sorter: (a, b) => a.minutes - b.minutes,
      render: (_: number, row) => formatElapsed(row.itemTs),
    },
    {
      title: "Cantidad",
      dataIndex: "qty",
      key: "qty",
      width: 100,
      align: "center",
      sorter: (a, b) => a.qty - b.qty,
    },
    {
      title: "Producto",
      dataIndex: "productDisplay",
      key: "productDisplay",
      ellipsis: false,
      render: (txt: string) => (
        <div style={{ whiteSpace: "pre-line" }}>{txt}</div>
      ),
    },
    {
      title: "Tiempo",
      dataIndex: "course",
      key: "course",
      width: 120,
      align: "center",
      render: (_: number, row) => {
        const course = row.course ?? 1;
        const labelMap: Record<number, string> = {
          1: "1er tiempo",
          2: "2do tiempo",
          3: "3er tiempo",
        };
        return <Tag>{labelMap[course] ?? `Tiempo ${course}`}</Tag>;
      },
      responsive: ["lg"],
    },
    {
      title: "Comentario de preparación",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 130,
      align: "center",
      render: (_: unknown, row: Row) => {
        const isDone =
          row.status === "prepared" || row.status === "cancelled";
        return (
          <Button
            type="primary"
            size="middle"
            disabled={isDone}
            onClick={() => finalizeProductForRow(row)}
          >
            Listo
          </Button>
        );
      },
    },
  ];

  async function finalizeProductForRow(row: Row) {
    try {
      const { data } = await apiOrder.post("/monitor/order-items/status", {
        itemIds: row.allItemIds,
        status: "prepared", // opcional, por defecto el backend ya pone 'prepared'
      });
      message.success(`Actualizados: ${data.updated.length}`);
      // refresca la tabla
      await loadAll();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo actualizar el estado";
      message.error(msg);
    }
  }
  const [now, setNow] = useState(
    new Date().toLocaleString("es-MX", { hour12: false })
  );
  // reloj
  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date().toLocaleString("es-MX", { hour12: false })),
      1000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
  /* 🔥 FIRE: rojo y parpadeo */
  .row-fire td {
    background-color: rgba(255, 59, 48, 0.18) !important;
    animation: fireBlinkBg 1s ease-in-out infinite;
  }
  @keyframes fireBlinkBg {
    0%, 100% { background-color: rgba(255, 59, 48, 0.12); }
    50% { background-color: rgba(255, 59, 48, 0.30); }
  }

  /* ⏱️ Tarde: amarillo fijo (sin parpadeo) */
  .row-overdue td {
    background-color: rgba(255, 193, 7, 0.22) !important;
  }
`}</style>
      <div className="w-full">
        <div className="flex items-start justify-between mb-6 p-3 bg-gray-100">
          <div className="w-full">
            <Title level={2} style={{ margin: 0, color: "#ff6b00" }}>
              GrowthSuite
            </Title>
            <Title level={3} style={{ margin: 0, color: "#0b63ff" }}>
              Monitor de Producción
            </Title>
          </div>
          <div className="flex items-start gap-3">
            <Button size="small" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
            <HeaderStatus
              now={now}
              pairState={"paired"}
              deviceLabel={stationCode ?? ""}
            />
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Tabla de items (agrupados) */}
          <div className="lg:col-span-5">
            <Card loading={loading}>
              <div className="flex items-baseline justify-between mb-3">
                <Title level={4} style={{ margin: 0 }}>
                  Items del turno {shiftId ?? "—"}
                </Title>
                <Button onClick={loadAll}>Actualizar</Button>
              </div>

              <Table<Row>
                size="middle"
                rowKey="key"
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: "max-content" }}
                rowClassName={(record) => {
                  const cls: string[] = [];

                  // 🔥 FIRE: rojo + parpadeo
                  if (record.status === "fire") {
                    cls.push("row-fire");
                  } else {
                    // ⏱️ +10 min: amarillo fijo (solo si no está listo/cancelado)
                    const s = record.status;
                    const isDone = s === "prepared" || s === "cancelled";
                    if (!isDone && record.minutes > 10) cls.push("row-overdue");
                  }

                  return cls.join(" ");
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

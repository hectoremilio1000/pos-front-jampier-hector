import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Tabs,
  Pagination,
  Drawer,
  Table,
  Button,
  Badge,
  Space,
  Empty,
  Spin,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/components/Auth/AuthContext";
import { tx } from "@/utils/realtime";
import apiOrder from "@/components/apis/apiOrder";

/** ======= Tipos mínimos útiles en este componente ======= */
type OrderItem = {
  id: number;
  productId?: number;
  name?: string; // opcional, por si tu API ya lo trae
  qty: number;
  unitPrice: number;
  total?: number; // si no lo trae, se calcula en render
  comment?: string | null;
  time?: string | null;
  product?: { name?: string } | null;
};

type OrderLite = {
  shiftId: number | null;
  id: number;
  tableName: string;
  persons: number;
  area_id: number | null;
  areaName: string | null;
  items: OrderItem[];
};

const PAGE_SIZE = 20;

const Cuentas: React.FC = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAreaId, setSelectedAreaId] = useState<number | "all">("all");
  const [page, setPage] = useState<number>(1);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  /** ======= Helpers ======= */
  const mergeItems = (
    existing: OrderItem[] = [],
    incoming: OrderItem[] = []
  ): OrderItem[] => {
    const byId = new Map<number, OrderItem>();
    for (const it of existing) byId.set(it.id, it);
    for (const it of incoming) {
      const prev = byId.get(it.id);
      byId.set(it.id, prev ? { ...prev, ...it } : it);
    }
    return Array.from(byId.values());
  };

  const upsertOrderItems = (orderId: number, newItems: OrderItem[]) => {
    console.log(newItems);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, items: mergeItems(o.items, newItems) } : o
      )
    );
  };

  const addOrReplaceOrder = (order: OrderLite) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx === -1) return [order, ...prev];
      const clone = prev.slice();
      clone[idx] = { ...prev[idx], ...order };
      return clone;
    });
  };

  /** ======= Fetch inicial ======= */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiOrder.get<OrderLite[]>("/orders", {
        params: { shift: "null" },
      });
      // Asegura estructura items
      const normalized = (res.data || []).map((o) => ({
        ...o,
        items: o.items || [],
      }));
      setOrders(normalized);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar las órdenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ======= Suscripción realtime ======= */
  useEffect(() => {
    if (!user?.restaurant?.id) return;

    const channel = `restaurants/${user.restaurant.id}/orders`;
    const ch = tx.subscription(channel);
    let stop: undefined | (() => void);

    ch.create()
      .then(() => {
        stop = ch.onMessage((msg: any) => {
          // Estructuras manejadas:
          // { type: 'order_changed', orderId?, order_id?, order?: { id }, items: [...] }
          // { type: 'order_created', order: { ...OrderLite } }
          // { type: 'order_closed', orderId? }
          const type = msg?.type;

          if (type === "order_changed") {
            const orderId: number | undefined =
              msg?.orderId ?? msg?.order_id ?? msg?.order?.id;

            if (!orderId) {
              console.warn("[orders] event without orderId:", msg);
              return;
            }

            const items: OrderItem[] = Array.isArray(msg?.items)
              ? msg.items
              : [];
            if (items.length === 0) return;

            upsertOrderItems(orderId, items);
          }

          if (type === "order_created" && msg?.order) {
            // Inserta o reemplaza con lo que venga del RT
            const order: OrderLite = {
              ...msg.order,
              items: msg.order.items || [],
            };
            addOrReplaceOrder(order);
          }

          if (type === "order_closed") {
            const orderId: number | undefined = msg?.orderId ?? msg?.order_id;
            if (!orderId) return;
            // Opcional: puedes removerla o marcarla como cerrada según tu UX
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
          }
        });
      })
      .catch((e: any) => {
        console.error("Error creando suscripción", channel, e);
        message.error("No se pudo suscribir a órdenes en tiempo real.");
      });

    return () => {
      stop?.();
      ch.delete();
    };
  }, [user?.restaurant?.id]);

  /** ======= Derivados para UI ======= */
  const areas = useMemo(() => {
    const m = new Map<number, string>();
    for (const o of orders) {
      if (o.area_id != null)
        m.set(o.area_id, o.areaName || `Área ${o.area_id}`);
    }
    const arr = Array.from(m.entries()).map(([id, name]) => ({ id, name }));
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (selectedAreaId !== "all") {
      base = base.filter((o) => o.area_id === selectedAreaId);
    }
    return base;
  }, [orders, selectedAreaId]);

  const total = filteredOrders.length;
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageData = filteredOrders.slice(start, end);

  useEffect(() => {
    // Si cambias el área, regresa a la página 1 para evitar quedar en páginas vacías
    setPage(1);
  }, [selectedAreaId]);

  /** ======= Tabla de items ======= */
  const columns: ColumnsType<OrderItem> = [
    {
      title: "Producto",
      dataIndex: "name",
      key: "name",
      render: (_, it) =>
        it.name || it.product?.name || `#${it.productId ?? it.id}`,
    },
    {
      title: "Cant.",
      dataIndex: "qty",
      key: "qty",
      align: "right",
      width: 80,
    },
    {
      title: "P. Unit.",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
      width: 120,
    },
    {
      title: "Total",
      key: "total",
      align: "right",
      render: (_, it) => {
        const t = it.total ?? (it.qty ?? 0) * (it.unitPrice ?? 0);
        return `$${Number(t).toFixed(2)}`;
      },
      width: 120,
    },
    {
      title: "Nota",
      dataIndex: "comment",
      key: "comment",
      ellipsis: true,
    },
  ];

  /** ======= Acciones ======= */
  const openOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setDrawerOpen(true);
  };

  const handlePagar = (order: OrderLite) => {
    // TODO: aquí conectas tu flujo real de pago/cierre
    console.log("Pagar orden", order);
    message.info(`Pagar orden #${order.id} (placeholder)`);
  };

  /** ======= Render ======= */
  return (
    <div style={{ padding: 16 }}>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Cuentas</h2>
        <Space>
          <Button onClick={fetchOrders}>Refrescar</Button>
        </Space>
      </Space>

      <Tabs
        activeKey={String(selectedAreaId)}
        onChange={(k) => setSelectedAreaId(k === "all" ? "all" : Number(k))}
        items={[
          { key: "all", label: "Todas" },
          ...areas.map((a) => ({ key: String(a.id), label: a.name })),
        ]}
      />

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", height: 240 }}>
          <Spin />
        </div>
      ) : total === 0 ? (
        <Empty description="Sin órdenes" />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 12,
              minHeight: 420,
            }}
          >
            {pageData.map((o) => (
              <Card
                key={o.id}
                hoverable
                onClick={() => openOrder(o.id)}
                size="small"
                style={{ borderRadius: 12 }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space
                    style={{ justifyContent: "space-between", width: "100%" }}
                  >
                    <strong>Mesa: {o.tableName || "-"}</strong>
                    <Badge count={o.persons} title="Personas" />
                  </Space>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    Área:{" "}
                    {o.areaName || (o.area_id != null ? `#${o.area_id}` : "-")}
                  </div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    Ítems: {o.items?.length ?? 0}
                  </div>
                  <Button
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openOrder(o.id);
                    }}
                  >
                    Ver detalle
                  </Button>
                </Space>
              </Card>
            ))}
          </div>

          <div
            style={{ marginTop: 12, display: "flex", justifyContent: "center" }}
          >
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>
        </>
      )}

      <Drawer
        title={
          selectedOrder
            ? `Orden #${selectedOrder.id} · Mesa ${selectedOrder.tableName || "-"}`
            : "Orden"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={680}
        destroyOnClose
        extra={
          selectedOrder ? (
            <Button type="primary" onClick={() => handlePagar(selectedOrder)}>
              Pagar
            </Button>
          ) : null
        }
      >
        {selectedOrder ? (
          <>
            <Space style={{ marginBottom: 8 }}>
              <Badge
                status="processing"
                text={`Área: ${selectedOrder.areaName || (selectedOrder.area_id ?? "-")}`}
              />
              <Badge color="blue" text={`Personas: ${selectedOrder.persons}`} />
              {selectedOrder.shiftId != null && (
                <Badge
                  color="purple"
                  text={`Shift: ${selectedOrder.shiftId}`}
                />
              )}
            </Space>
            <Table<OrderItem>
              rowKey={(r) => r.id}
              columns={columns}
              dataSource={selectedOrder.items || []}
              size="small"
              pagination={false}
            />
          </>
        ) : (
          <Empty />
        )}
      </Drawer>
    </div>
  );
};

export default Cuentas;

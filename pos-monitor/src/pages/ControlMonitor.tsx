import { useEffect, useMemo, useState } from "react";
import { Button, Card, Typography, message, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useShift } from "@/context/ShiftContext";
import apiOrder from "@/components/apis/apiOrder";

const CASH_API = import.meta.env.VITE_API_URL_CASH; // p.ej. http://localhost:3335/api
const { Title, Paragraph } = Typography;

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
  routeAreaId?: number | null;
  isModifier?: boolean | null;
  isCompositeProductMain?: boolean | null;
  compositeProductId?: number | null;
  createdAt?: string; // si tu API usa created_at, cambia el cálculo de minutos
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
};

export function ControlMonitor() {
  const { shiftId, setShiftId } = useShift();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMainId, setSelectedMainId] = useState<number | null>(null);

  function minutesSince(ts?: string) {
    if (!ts) return 0;
    const ms = Date.now() - new Date(ts).getTime();
    return Math.max(0, Math.floor(ms / 60000));
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
  async function fetchOrdersByShift(id: number) {
    try {
      const { data } = await apiOrder.get<OrdersResponse>("/monitor/orders", {
        params: { shiftId: id },
        // timeout: 10000, // opcional
      });
      setOrders(data?.orders ?? []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudieron cargar órdenes";
      throw new Error(msg);
    }
  }

  async function loadAll() {
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
  }

  // Refresco manual con botón (si quieres automático, agrega useEffect con setInterval)
  useEffect(() => {
    loadAll();
    // const t = setInterval(loadAll, 10000);
    // return () => clearInterval(t);
  }, []); // eslint-disable-line

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

        if (isMain && compositeId) {
          // buscar modificadores del mismo composite
          const modifiers = o.items.filter(
            (x) =>
              x.id !== it.id &&
              !!x.isModifier &&
              (x.compositeProductId ?? null) === compositeId
          );
          // marcar consumidos (principal + mods)
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
            minutes: minutesSince(it.createdAt), // si usas created_at: (it as any).created_at
            qty: it.qty ?? 1,
            productDisplay,
            notes: it.notes ?? "",
            mainItemId: it.id,
            allItemIds: [it.id, ...modifiers.map((m) => m.id)],
            status: it.status,
          });
        } else if (isMod && compositeId) {
          // lo pinta su principal, saltar
          continue;
        } else {
          // item normal
          consumed.add(it.id);
          rows.push({
            key: `${o.id}-single-${it.id}`,
            orderId: o.id,
            orderNumber: orderNum,
            tableName,
            minutes: minutesSince(it.createdAt),
            qty: it.qty ?? 1,
            productDisplay: it.product?.name ?? "(Producto)",
            notes: it.notes ?? "",
            mainItemId: it.id,
            allItemIds: [it.id],
            status: it.status,
          });
        }
      }
    }
    return rows;
  }, [orders]);

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
      title: "Minutos",
      dataIndex: "minutes",
      key: "minutes",
      width: 100,
      align: "center",
      sorter: (a, b) => a.minutes - b.minutes,
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
      title: "Comentario de preparación",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
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

  const selectedRow = useMemo(
    () => data.find((r) => r.mainItemId === selectedMainId) || null,
    [data, selectedMainId]
  );

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Tabla de items (agrupados) */}
      <div className="lg:col-span-3">
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
            rowClassName={(record) =>
              record.mainItemId === selectedMainId ? "bg-blue-50" : ""
            }
            onRow={(record) => ({
              onClick: () => setSelectedMainId(record.mainItemId),
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      </div>

      {/* Acciones */}
      <div className="lg:col-span-2">
        <Card>
          <Title level={4} style={{ marginTop: 0 }}>
            Acciones
          </Title>
          {selectedRow ? (
            <>
              <Paragraph>
                Item seleccionado: #{selectedRow.mainItemId}
                {selectedRow.allItemIds.length > 1 &&
                  ` (compuesto: ${selectedRow.allItemIds.join(", ")})`}
              </Paragraph>
              <div className="flex gap-2">
                <Button
                  type="primary"
                  onClick={() => finalizeProductForRow(selectedRow)}
                >
                  Finalizar producto
                </Button>
              </div>
            </>
          ) : (
            <Paragraph>Selecciona un item de la lista para operar.</Paragraph>
          )}
        </Card>
      </div>
    </div>
  );
}

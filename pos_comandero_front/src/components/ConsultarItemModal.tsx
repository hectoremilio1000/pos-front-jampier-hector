// /src/components/Comandero/ConsultarItemModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Table, Tag, Typography, message, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiOrder from "@/components/apis/apiOrder";
import { QRCodeCanvas } from "qrcode.react";

const { Text } = Typography;

type Grupo = { id: number; name: string };
type AreaImpresion = { id: number; restaurantId: number; name: string };
interface Area {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}
interface Service {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}
type Producto = {
  id: number;
  name: string;
  group: Grupo;
  subgrupo?: string;
  categoria: "alimentos" | "bebidas" | "otros";
  unidad: string;
  basePrice: number;
  contieneIVA: boolean;
  printArea: number;
  areaImpresion: AreaImpresion;
  suspendido: boolean;
  isEnabled: boolean;
};

type ItemStatus = "pending" | "sent" | "fire" | "prepared" | "cancelled" | null;

type OrderItem = {
  id?: number;
  orderId: number | null;
  productId: number;
  qty: number;
  unitPrice: number;
  basePrice: number;
  taxRate: number;
  total: number;
  notes: string | null;
  course: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number | null;
  discountAppliedBy: number | null;
  discountReason: string | null;
  product: Producto;
  status: string | null;

  // Compuesto / modificadores:
  isModifier?: boolean | null;
  isCompositeProductMain?: boolean | null;
  compositeProductId?: string | null;

  // Timestamps para “Minutos”
  createdAt?: string;
};

type OrderSummary = {
  shiftId: number | null;
  id: number;
  tableName: string;
  persons: number;
  area_id: number | null;
  service_id: number | null;
  area: Area | null;
  service: Service | null;
  items: OrderItem[];
  restaurant?: { localBaseUrl?: string | null; id?: number } | null;
  restaurantId?: number | null;
  status?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mesa: number | string;
  detalle_cheque: OrderItem[];
  orderCurrent?: OrderSummary | null;
};

type Row = {
  key: string;
  orderNumber: number; // 1..N
  minutes: number;
  qty: number;
  course: number;
  productDisplay: string; // principal + \n > modificadores
  notes: string;
  status: string | null;
  mainItemId?: number; // puede no existir si aún no persiste
  allItemIds: number[]; // principal + modificadores (o único)
};

function minutesSince(ts?: string) {
  if (!ts) return 0;
  const ms = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function StatusTag({ status }: { status: ItemStatus }) {
  switch (status) {
    case "pending":
      return <Tag color="default">pending</Tag>;
    case "sent":
      return <Tag color="blue">sent</Tag>;
    case "fire":
      return <Tag color="orange">fire</Tag>;
    case "prepared":
      return <Tag color="green">prepared</Tag>;
    case "cancelled":
      return <Tag color="red">cancelled</Tag>;
    default:
      return <Tag>—</Tag>;
  }
}

const ConsultarItemModal: React.FC<Props> = ({
  visible,
  onClose,
  mesa,
  detalle_cheque,
  orderCurrent,
}) => {
  const [items, setItems] = useState<OrderItem[]>(detalle_cheque || []);
  const [loading, setLoading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const order = orderCurrent ?? null;

  const canViewQr = String(order?.status ?? "").toLowerCase() === "printed";
  const restaurantId = order?.restaurantId;
  const orderId = order?.id;

  const publicPath =
    restaurantId && orderId ? `/${restaurantId}/qrscan/${orderId}` : null;

  const publicUrl = useMemo(() => {
    if (!publicPath) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${publicPath}`;
  }, [publicPath]);

  const money = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);

  const totals = useMemo(() => {
    const sumTotal = items.reduce(
      (acc, it) => acc + (Number(it.total) || 0),
      0,
    );

    const sumBase = items.reduce((acc, it) => {
      const qty = Number(it.qty) || 0;
      const base = Number(it.basePrice ?? it.unitPrice) || 0;
      return acc + base * qty;
    }, 0);

    const iva = sumTotal - sumBase;

    return {
      subtotal: sumBase,
      iva,
      total: sumTotal,
    };
  }, [items]);

  useEffect(() => {
    setItems(detalle_cheque || []);
  }, [detalle_cheque]);

  const data: Row[] = useMemo(() => {
    const rows: Row[] = [];
    const consumed = new Set<number>();
    let ordinal = 0;

    const getSafeId = (oi: OrderItem) =>
      typeof oi.id === "number" ? oi.id : oi.productId * -1;

    for (const it of items) {
      const safeId = getSafeId(it);
      if (consumed.has(safeId)) continue;

      const isMain = !!it.isCompositeProductMain;
      const isMod = !!it.isModifier;
      const compositeId = it.compositeProductId ?? null;

      if (isMain && compositeId) {
        const modifiers = items.filter(
          (x) =>
            getSafeId(x) !== safeId &&
            !!x.isModifier &&
            (x.compositeProductId ?? null) === compositeId,
        );

        consumed.add(safeId);
        modifiers.forEach((m) => consumed.add(getSafeId(m)));

        const mainName = it.product?.name ?? "(Producto)";
        const modsNames = modifiers
          .map((m) => m.product?.name)
          .filter(Boolean) as string[];
        const productDisplay =
          mainName +
          (modsNames.length
            ? "\n" + modsNames.map((n) => `> ${n}`).join("\n")
            : "");

        ordinal += 1;
        rows.push({
          key: `main-${safeId}`,
          orderNumber: ordinal,
          minutes: minutesSince(it.createdAt),
          qty: it.qty ?? 1,
          course: it.course ?? 1,
          productDisplay,
          notes: it.notes ?? "",
          status: it.status ?? null, // usamos el status del principal
          mainItemId: it.id,
          allItemIds: [
            ...(typeof it.id === "number" ? [it.id] : []),
            ...modifiers
              .map((m) => m.id)
              .filter((x): x is number => typeof x === "number"),
          ],
        });
      } else if (isMod && compositeId) {
        continue; // lo pintará su principal
      } else {
        consumed.add(safeId);
        ordinal += 1;
        rows.push({
          key: `single-${safeId}`,
          orderNumber: ordinal,
          minutes: minutesSince(it.createdAt),
          qty: it.qty ?? 1,
          course: it.course ?? 1,
          productDisplay: it.product?.name ?? "(Producto)",
          notes: it.notes ?? "",
          status: it.status ?? null,
          mainItemId: it.id,
          allItemIds: typeof it.id === "number" ? [it.id] : [],
        });
      }
    }
    return rows;
  }, [items]);

  const columns: ColumnsType<Row> = [
    {
      title: "N° Orden",
      dataIndex: "orderNumber",
      key: "orderNumber",
      align: "center",
      width: 90,
      sorter: (a, b) => a.orderNumber - b.orderNumber,
    },
    {
      title: "Minutos",
      dataIndex: "minutes",
      key: "minutes",
      width: 100,
      align: "center",
      sorter: (a, b) => a.minutes - b.minutes,
      render: (v) => <Text strong>{v}</Text>,
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
      render: (txt: string) => (
        <div style={{ whiteSpace: "pre-line" }}>{txt}</div>
      ),
    },
    {
      title: "Comentario de preparación",
      dataIndex: "notes",
      key: "notes",
      render: (txt: string) =>
        txt ? <Tag color="blue">💬 {txt}</Tag> : <Tag>—</Tag>,
    },
    {
      title: "Tiempo",
      dataIndex: "course",
      key: "course",
      width: 120,
      align: "center",
      render: (_: number, row: Row) => {
        const course = row.course ?? 1;
        const labelMap: Record<number, string> = {
          1: "1er tiempo",
          2: "2do tiempo",
          3: "3er tiempo",
        };
        return <Tag>{labelMap[course] ?? `Tiempo ${course}`}</Tag>;
      },
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (st: ItemStatus) => <StatusTag status={st} />,
    },
    {
      title: "Acción",
      key: "actions",
      width: 160,
      render: (_: any, row: Row) => {
        const course = row.course ?? 1;
        const canFire = row.status === "sent" && course > 1; // 🔥 solo si está en 'sent' y no es 1er tiempo
        return (
          <Tooltip
            title={
              canFire
                ? "Enviar a FIRE"
                : course <= 1
                  ? "FIRE solo aplica a tiempos > 1"
                  : "Solo disponible cuando el estado es 'sent'"
            }
          >
            <Button
              type="primary"
              size="small"
              onClick={() => onFire(row)}
              disabled={!row.allItemIds.length || !canFire}
            >
              Fired
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  async function onFire(row: Row) {
    if (!row.allItemIds.length) {
      return message.warning("Item sin id persistido todavía.");
    }
    try {
      setLoading(true);
      await apiOrder.post("/order-items/status", {
        itemIds: row.allItemIds,
        status: "fire",
      });

      // Refrescar estado local: marcar esos ids como 'fire'
      setItems((prev) =>
        prev.map((it) =>
          it.id && row.allItemIds.includes(it.id)
            ? { ...it, status: "fire" }
            : it,
        ),
      );
      message.success("Producto enviado a FIRE");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo actualizar el estado";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal
        open={visible}
        title={`Consultar productos — MESA: ${mesa}`}
        onCancel={onClose}
        footer={null}
        width={1200}
        style={{ top: 10 }}
        destroyOnClose
      >
        {/* contenedor con scroll + footer fijo */}
        <div className="flex flex-col h-[75vh]">
          <div className="flex-1 overflow-auto">
            <Table<Row>
              className="w-full"
              dataSource={data}
              columns={columns}
              rowKey={(r) => r.key}
              loading={loading}
              pagination={false}
              size="middle"
            />
          </div>

          {/* footer sticky abajo, totales a la derecha */}
          <div
            className="sticky bottom-0 border-t bg-white"
            style={{ padding: 12 }}
          >
            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-2">
                <Button
                  type="primary"
                  onClick={() => setQrVisible(true)}
                  disabled={!canViewQr || !publicUrl}
                >
                  Ver QR
                </Button>

                <div className="text-right">
                  <div className="flex gap-6 justify-end">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">
                      {money(totals.subtotal)}
                    </span>
                  </div>

                  <div className="flex gap-6 justify-end">
                    <span className="text-gray-500">IVA</span>
                    <span className="font-medium">{money(totals.iva)}</span>
                  </div>

                  <div className="flex gap-6 justify-end">
                    <span className="text-gray-500">Total</span>
                    <span className="text-lg font-semibold">
                      {money(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!canViewQr && (
              <div className="text-right text-xs text-gray-500 mt-2">
                El QR solo está disponible cuando la orden está en status{" "}
                <b>printed</b>.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal
        open={qrVisible}
        title="QR de la cuenta"
        onCancel={() => setQrVisible(false)}
        footer={null}
        destroyOnClose
      >
        {publicUrl ? (
          <div className="flex flex-col items-center gap-4">
            <QRCodeCanvas value={publicUrl} size={220} includeMargin />

            <div className="w-full">
              <div className="text-xs text-gray-500 mb-1">Link público:</div>
              <div className="break-all text-sm">{publicUrl}</div>

              <div className="flex justify-end mt-3">
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      message.success("Link copiado");
                    } catch {
                      message.error("No se pudo copiar el link");
                    }
                  }}
                >
                  Copiar link
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            No hay link público disponible (falta restaurantId / orderId).
          </div>
        )}
      </Modal>
    </>
  );
};

export default ConsultarItemModal;

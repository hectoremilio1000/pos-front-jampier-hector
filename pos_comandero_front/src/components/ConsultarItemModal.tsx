// /src/components/Comandero/ConsultarItemModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Modal,
  Table,
  Tag,
  Typography,
  message,
  Tooltip,
  Form,
  Input,
  Radio,
  InputNumber,
  Space,
  Checkbox,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiOrder from "@/components/apis/apiOrder";

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
  isCourtesy?: boolean | null;
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

function getRestaurantIdFromJwt(): number {
  const payload = parseJwt<{ restaurantId?: number }>(
    sessionStorage.getItem("kiosk_jwt"),
  );
  if (payload?.restaurantId) return Number(payload.restaurantId);

  try {
    const stored = sessionStorage.getItem("kiosk_restaurant_id") || "";
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
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
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [discountIsCourtesy, setDiscountIsCourtesy] = useState<boolean>(false);
  const [discountTargetRow, setDiscountTargetRow] = useState<Row | null>(null);
  const [discountManagerPassword, setDiscountManagerPassword] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelManagerPassword, setCancelManagerPassword] = useState("");
  const [cancelTargetRow, setCancelTargetRow] = useState<Row | null>(null);

  const money = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);

  const getRestaurantId = () =>
    Number(orderCurrent?.restaurantId ?? 0) || getRestaurantIdFromJwt();

  async function requestApprovalToken(
    action: string,
    password: string,
    targetId: number,
  ) {
    const restaurantId = Number(getRestaurantId() || 0);
    if (!restaurantId) throw new Error("restaurantId faltante");
    const apiUrlAuth = import.meta.env.VITE_API_URL_AUTH;
    const res = await fetch(`${apiUrlAuth}/approvals/issue-by-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        stationId: null, // comandero no está amarrado a station/caja
        password,
        action,
        targetId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error || data?.message || "Aprobación rechazada";
      throw new Error(err);
    }
    return String(data?.approval_token || "");
  }

  const totals = useMemo(() => {
    const activeItems = items.filter(
      (it) => String(it.status || "").toLowerCase() !== "cancelled",
    );
    const sumGross = activeItems.reduce(
      (acc, it) => acc + (Number(it.total) || 0),
      0,
    );
    const sumDiscount = activeItems.reduce(
      (acc, it) => acc + (Number(it.discountAmount) || 0),
      0,
    );

    const sumBase = activeItems.reduce((acc, it) => {
      const qty = Number(it.qty) || 0;
      const base = Number(it.basePrice ?? it.unitPrice) || 0;
      return acc + base * qty;
    }, 0);

    const netTotal = Math.max(0, sumGross - sumDiscount);
    const netBase = Math.max(0, sumBase - sumDiscount);
    const iva = netTotal - netBase;

    return {
      subtotal: netBase,
      iva,
      total: netTotal,
      discounts: sumDiscount,
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
      title: "Descuento",
      key: "discount",
      width: 140,
      align: "right",
      render: (_: any, row: Row) => {
        const discountSum = items
          .filter((it) => it.id && row.allItemIds.includes(it.id))
          .reduce((acc, it) => acc + Number(it.discountAmount || 0), 0);
        const hasCourtesy = items.some(
          (it) => it.id && row.allItemIds.includes(it.id) && it.isCourtesy
        );
        if (!discountSum && !hasCourtesy) return <Text>—</Text>;
        return (
          <div>
            <Text strong>{money(discountSum)}</Text>
            {hasCourtesy ? (
              <Tag color="green" style={{ marginLeft: 6 }}>
                Cortesía
              </Tag>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Acción",
      key: "actions",
      width: 340,
      render: (_: any, row: Row) => {
        const course = row.course ?? 1;
        const canFire = row.status === "sent" && course > 1; // 🔥 solo si está en 'sent' y no es 1er tiempo
        const orderStatus = String(orderCurrent?.status || "").toLowerCase();
        const canAdjust = ["open", "in_progress", "reopened"].includes(orderStatus);
        return (
          <Space size="small" wrap>
            <Button
              danger
              size="small"
              onClick={() => openCancelModal(row)}
              disabled={
                !row.allItemIds.length || row.status === "cancelled" || !canAdjust
              }
            >
              Cancelar
            </Button>
            <Button
              size="small"
              onClick={() => openDiscountModal(row)}
              disabled={!row.allItemIds.length || !canAdjust}
            >
              Descuento
            </Button>
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
          </Space>
        );
      },
    },
  ];

  function openDiscountModal(row: Row) {
    setDiscountTargetRow(row);
    setDiscountIsCourtesy(false);
    setDiscountType("percent");
    setDiscountValue(0);
    setDiscountReason("");
    setDiscountManagerPassword("");
    setDiscountModalOpen(true);
  }

  async function applyDiscountToRow() {
    if (!discountTargetRow) return;
    const orderId = orderCurrent?.id ?? null;
    if (!orderId) {
      return message.error("No hay orden seleccionada.");
    }
    const targetIds = discountTargetRow.mainItemId
      ? [discountTargetRow.mainItemId]
      : discountTargetRow.allItemIds;
    if (!targetIds.length) {
      return message.warning("Item sin id persistido todavía.");
    }
    if (!Number.isFinite(Number(discountValue)) || Number(discountValue) < 0) {
      return message.warning("Ingresa un descuento válido.");
    }
    if (!discountManagerPassword) {
      return message.warning("Ingresa la contraseña del administrador.");
    }

    try {
      setLoading(true);
      const approval = await requestApprovalToken(
        "order.discount",
        discountManagerPassword,
        orderId,
      );

      const res = await apiOrder.post(
        `/orders/${orderId}/items/discount`,
        {
          itemIds: targetIds,
          discountType,
          discountValue: Number(discountValue),
          discountReason: discountReason?.trim() || null,
          isCourtesy: discountIsCourtesy,
        },
        {
          headers: { "X-Approval": `Bearer ${approval}` },
          validateStatus: () => true,
        },
      );

      if (!res || res.status < 200 || res.status >= 300) {
        const err =
          (res?.data && res.data.error) ||
          "No se pudo aplicar el descuento al producto";
        throw new Error(err);
      }

      const updatedItems = Array.isArray(res.data?.items)
        ? res.data.items
        : null;

      if (updatedItems && updatedItems.length) {
        const updatedMap = new Map<number, Partial<OrderItem>>(
          updatedItems.map((it: any) => [Number(it.id), it as Partial<OrderItem>]),
        );
        setItems((prev) =>
          prev.map((it) =>
            it.id && updatedMap.has(Number(it.id))
              ? {
                  ...it,
                  ...(updatedMap.get(Number(it.id)) || {}),
                }
              : it,
          ),
        );
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id && targetIds.includes(it.id)
              ? {
                  ...it,
                  discountType,
                  discountValue: Number(discountValue),
                  discountAmount:
                    discountType === "percent"
                      ? Math.round(
                          (Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)) *
                            (Number(discountValue) / 100) *
                            100,
                        ) / 100
                      : Math.min(
                          Number(discountValue),
                          Number(it.qty ?? 0) * Number(it.unitPrice ?? 0),
                        ),
                  discountReason: discountReason?.trim() || null,
                  isCourtesy: discountIsCourtesy,
                }
              : it,
          ),
        );
      }

      message.success(
        discountIsCourtesy ? "Cortesía aplicada al producto" : "Descuento aplicado al producto"
      );
      setDiscountModalOpen(false);
      setDiscountTargetRow(null);
      setDiscountManagerPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo aplicar el descuento";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function openCancelModal(row: Row) {
    if (!row.allItemIds.length) {
      return message.warning("Item sin id persistido todavía.");
    }
    setCancelTargetRow(row);
    setCancelReason("");
    setCancelManagerPassword("");
    setCancelModalOpen(true);
  }

  async function applyCancelToRow() {
    if (!cancelTargetRow) return;
    const orderId = orderCurrent?.id ?? null;
    if (!orderId) {
      return message.error("No hay orden seleccionada.");
    }
    if (!cancelReason.trim()) {
      return message.warning("Escribe el motivo de cancelación.");
    }
    if (!cancelManagerPassword) {
      return message.warning("Ingresa la contraseña del administrador.");
    }

    try {
      setLoading(true);
      const approval = await requestApprovalToken(
        "order.items.void",
        cancelManagerPassword,
        orderId,
      );

      const res = await apiOrder.post(
        `/orders/${orderId}/items/void`,
        {
          itemIds: cancelTargetRow.allItemIds,
          reason: cancelReason.trim(),
        },
        {
          headers: { "X-Approval": `Bearer ${approval}` },
          validateStatus: () => true,
        },
      );

      if (!res || res.status < 200 || res.status >= 300) {
        const err =
          (res?.data && res.data.error) ||
          "No se pudo cancelar el producto";
        throw new Error(err);
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id && cancelTargetRow.allItemIds.includes(it.id)
            ? { ...it, status: "cancelled" }
            : it,
        ),
      );

      message.success("Producto cancelado");
      setCancelModalOpen(false);
      setCancelTargetRow(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo cancelar el producto";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

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

  const mesaLabel =
    orderCurrent?.tableName ||
    (typeof mesa === "number" ? `Mesa ${mesa}` : String(mesa || "—"));
  const personsLabel =
    typeof orderCurrent?.persons === "number"
      ? `${orderCurrent.persons}`
      : "—";
  const orderIdLabel =
    typeof orderCurrent?.id === "number" ? `#${orderCurrent.id}` : "—";

  return (
    <>
      <Modal
        open={visible}
        title="Consultar productos"
        onCancel={onClose}
        footer={null}
        width={1200}
        style={{ top: 10 }}
        destroyOnHidden
      >
        {/* contenedor con scroll + footer fijo */}
        <div className="flex flex-col h-[75vh]">
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-gray-500">Mesa:</span>{" "}
                <span className="font-semibold">{mesaLabel}</span>
              </div>
              <div>
                <span className="text-gray-500">Comensales:</span>{" "}
                <span className="font-semibold">{personsLabel}</span>
              </div>
              <div>
                <span className="text-gray-500">Orden:</span>{" "}
                <span className="font-semibold">{orderIdLabel}</span>
              </div>
            </div>
          </div>
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
              <div className="text-right">
                <div className="flex gap-6 justify-end">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{money(totals.subtotal)}</span>
                </div>

                <div className="flex gap-6 justify-end">
                  <span className="text-gray-500">Descuento</span>
                  <span className="font-medium">{money(totals.discounts)}</span>
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
        </div>
      </Modal>

      <Modal
        open={cancelModalOpen}
        title="Cancelar producto"
        onCancel={() => setCancelModalOpen(false)}
        onOk={applyCancelToRow}
        okText="Cancelar producto"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Motivo" required>
            <Input.TextArea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </Form.Item>
          <Form.Item label="Contraseña manager" required>
            <Input.Password
              value={cancelManagerPassword}
              onChange={(e) => setCancelManagerPassword(e.target.value)}
              placeholder="Contraseña de owner/admin/manager"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={discountModalOpen}
        title="Descuento por producto"
        onCancel={() => setDiscountModalOpen(false)}
        onOk={applyDiscountToRow}
        okText="Aplicar descuento"
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Tipo de descuento">
            <Radio.Group
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <Radio value="percent">% porcentaje</Radio>
              <Radio value="fixed">Monto fijo</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label={discountType === "percent" ? "Valor (%)" : "Monto (MXN)"}
          >
            <InputNumber
              min={0}
              max={discountType === "percent" ? 100 : undefined}
              value={discountValue}
              onChange={(v) => setDiscountValue(Number(v ?? 0))}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item label="Motivo (opcional)">
            <Input.TextArea
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              rows={3}
            />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={discountIsCourtesy}
              onChange={(e) => setDiscountIsCourtesy(e.target.checked)}
            >
              Es cortesía
            </Checkbox>
          </Form.Item>
          <Form.Item label="Contraseña manager" required>
            <Input.Password
              value={discountManagerPassword}
              onChange={(e) => setDiscountManagerPassword(e.target.value)}
              placeholder="Contraseña de owner/admin/manager"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ConsultarItemModal;

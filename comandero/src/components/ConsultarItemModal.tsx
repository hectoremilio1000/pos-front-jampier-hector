// /src/components/Comandero/ConsultarItemModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Table, Tag, Typography, message, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiOrder from "@/components/apis/apiOrder";

const { Text } = Typography;

type Grupo = { id: number; name: string };
type AreaImpresion = { id: number; restaurantId: number; name: string };

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
  compositeProductId?: number | null;

  // Timestamps para “Minutos”
  createdAt?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mesa: number | string;
  detalle_cheque: OrderItem[];
};

type Row = {
  key: string;
  orderNumber: number; // 1..N
  minutes: number;
  qty: number;
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
}) => {
  const [items, setItems] = useState<OrderItem[]>(detalle_cheque || []);
  const [loading, setLoading] = useState(false);

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
            (x.compositeProductId ?? null) === compositeId
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
        const canFire = row.status === "sent"; // 🔥 solo si está en 'sent'
        return (
          <Tooltip
            title={
              canFire
                ? "Enviar a FIRE"
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
            : it
        )
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
    <Modal
      open={visible}
      title={`Consultar productos — MESA: ${mesa}`}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 10 }}
      destroyOnClose
    >
      <div className="flex gap-4 min-h-[600px]">
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
    </Modal>
  );
};

export default ConsultarItemModal;

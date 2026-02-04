// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/Runs/PurchaseRunOrdersTable.tsx
import { Button, Popconfirm, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { PurchaseOrderRow } from "@/lib/api_inventory";
import { getOrderOrigin, orderOriginTagColor, orderStatusTagColor } from "../purchaseUi";
import { DeleteOutlined } from "@ant-design/icons";

type Props = {
  rows: PurchaseOrderRow[];
  onEdit: (order: PurchaseOrderRow) => void;
  onOpenItems: (order: PurchaseOrderRow) => void;
  onDelete: (order: PurchaseOrderRow) => void;
  disabledActions?: boolean;
};

export default function PurchaseRunOrdersTable({
  rows,
  onEdit,
  onOpenItems,
  onDelete,
  disabledActions = false,
}: Props) {
  const columns: ColumnsType<PurchaseOrderRow> = [
    { title: "#", dataIndex: "orderNumber", width: 90, render: (v, r) => v ?? r.id },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (v) => <Tag color={orderStatusTagColor(v)}>{String(v ?? "—")}</Tag>,
    },
    {
      title: "Origen",
      width: 170,
      render: (_, r) => {
        const origin = getOrderOrigin(r);
        return <Tag color={orderOriginTagColor(origin.key)}>{origin.label}</Tag>;
      },
    },
    {
      title: "Proveedor",
      width: 240,
      render: (_, r) => r.supplier?.name ?? (r.supplierId ? `#${r.supplierId}` : "—"),
    },
    {
      title: "Almacén",
      width: 180,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    {
      title: "Fecha de entrega",
      dataIndex: "applicationDate",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Acciones",
      width: 260,
      render: (_, r) => {
        const isDraft = String(r.status ?? "draft") === "draft";
        const deleteDisabled = disabledActions || !isDraft || Boolean(r.receivedAt);
        const deleteReason = disabledActions
          ? "El viaje está cerrado"
          : !isDraft
            ? "La orden no está en borrador"
            : r.receivedAt
              ? "La orden ya fue recibida"
              : "";
        return (
          <Space>
            <Button size="small" onClick={() => onEdit(r)} disabled={disabledActions}>
              Editar
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => onOpenItems(r)}
              disabled={disabledActions}
            >
              Agregar productos
            </Button>
            <Popconfirm
              title="¿Eliminar orden?"
              okText="Eliminar"
              cancelText="Cancelar"
              onConfirm={() => onDelete(r)}
              disabled={deleteDisabled}
            >
              <Tooltip title={deleteDisabled ? deleteReason : ""}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={deleteDisabled}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return <Table rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />;
}

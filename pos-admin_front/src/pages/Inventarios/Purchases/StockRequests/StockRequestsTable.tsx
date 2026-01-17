import { Button, Popconfirm, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { StockRequestRow } from "@/lib/api_inventory";
import { stockRequestStatusTagColor } from "../purchaseUi";
import { DeleteOutlined } from "@ant-design/icons";

type Props = {
  rows: StockRequestRow[];
  onEdit: (row: StockRequestRow) => void;
  onOpenItems: (row: StockRequestRow) => void;
  onDelete: (row: StockRequestRow) => void;
  disabledActions?: boolean;
};

export default function StockRequestsTable({
  rows,
  onEdit,
  onOpenItems,
  onDelete,
  disabledActions = false,
}: Props) {
  const columns: ColumnsType<StockRequestRow> = [
    { title: "#", dataIndex: "id", width: 80 },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (v) => <Tag color={stockRequestStatusTagColor(String(v))}>{String(v ?? "—")}</Tag>,
    },
    {
      title: "Área",
      dataIndex: "areaLabel",
      width: 140,
      render: (v) => v ?? "—",
    },
    {
      title: "Almacén",
      width: 180,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    {
      title: "Solicitado",
      dataIndex: "requestedAt",
      width: 180,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Notas",
      dataIndex: "notes",
      render: (v) => (v ? String(v) : "—"),
    },
    {
      title: "Acciones",
      width: 260,
      render: (_, r) => {
        const isDraft = String(r.status ?? "draft") === "draft";
        const deleteDisabled = disabledActions || !isDraft;
        const deleteReason = disabledActions
          ? "El viaje está cerrado"
          : !isDraft
            ? "El pedido no está en borrador"
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
              title="¿Eliminar pedido?"
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

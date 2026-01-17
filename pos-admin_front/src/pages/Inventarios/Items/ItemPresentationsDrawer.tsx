import { useEffect, useState } from "react";
import { Button, Drawer, Popconfirm, Space, Table, message, Tag } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  InventoryItemRow,
  InventoryPresentationRow,
  MeasurementUnitRow,
} from "@/lib/api_inventory";
import {
  listInventoryPresentations,
  deleteInventoryPresentation,
} from "@/lib/api_inventory";
import PresentationEditModal from "./PresentationEditModal";

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: number;
  item: InventoryItemRow | null;
  units: MeasurementUnitRow[];
};

export default function ItemPresentationsDrawer({
  open,
  onClose,
  restaurantId,
  item,
  units,
}: Props) {
  const [rows, setRows] = useState<InventoryPresentationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryPresentationRow | null>(null);

  async function load() {
    if (!item?.id) return;
    setLoading(true);
    try {
      const r = await listInventoryPresentations(restaurantId, { inventoryItemId: item.id });
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando presentaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  async function handleDelete(presentationId: number) {
    setSaving(true);
    try {
      await deleteInventoryPresentation(restaurantId, presentationId);
      message.success("Presentación eliminada");
      await load();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      // tu http() arma errores tipo: "409 <mensaje>"
      if (msg.startsWith("409")) {
        message.warning("No se puede eliminar porque ya se usó en compras. Mejor desactívala.");
      } else {
        message.error(e?.message ?? "Error eliminando presentación");
      }
      await load(); // por si cambió algo o para refrescar estado
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnsType<InventoryPresentationRow> = [
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Contenido (base)",
      dataIndex: "contentInBaseUnit",
      width: 120,
      render: (v) => <span>{Number(v ?? 0).toLocaleString()}</span>,
    },
    {
      title: "Unidad presentación",
      width: 140,
      render: (_, r) =>
        r.presentationUnit?.code ?? (r.presentationUnitId ? String(r.presentationUnitId) : "-"),
    },
    {
      title: "Costo std (MXN)",
      width: 120,
      render: (_, r) => {
        const v = r.detail?.standardCost;
        const costLabel =
          v === null || v === undefined
            ? "-"
            : Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
        const lastCost = r.defaultSupplierLastCost;
        const lastCostLabel =
          lastCost === null || lastCost === undefined
            ? "—"
            : Number(lastCost).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

        const supplierLabel =
          r.detail?.supplier?.name ??
          (r.detail?.supplierId ? `Proveedor #${r.detail?.supplierId}` : null);

        return (
          <Space direction="vertical" size={2}>
            <span>{costLabel}</span>
            {supplierLabel ? (
              <Space direction="vertical" size={2}>
                <Tag color="purple">{`Proveedor default: ${supplierLabel}`}</Tag>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  Último costo (de ese proveedor): {lastCostLabel}
                </span>
              </Space>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Último costo (sin proveedor default): {lastCostLabel}
              </span>
            )}
          </Space>
        );
      },
    },

    {
      title: "Compra (default)",
      width: 100,
      render: (_, r) => (r.isDefaultPurchase ? <Tag color="blue">Default</Tag> : "No"),
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      width: 80,
      render: (v) => (v === false ? "No" : "Sí"),
    },
    {
      title: "Acciones",
      width: 140,
      render: (_, r) => {
        const usageCount = Number(r.usageCount ?? 0);
        const canDelete = r.canDelete ?? usageCount === 0;

        return (
          <Space size="middle">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(r);
                setEditOpen(true);
              }}
              disabled={saving}
            />
            {canDelete ? (
              <Popconfirm
                title="¿Eliminar presentación?"
                description="Solo se puede eliminar si nunca se ha usado en compras o conteos."
                okText="Eliminar"
                cancelText="Cancelar"
                onConfirm={() => handleDelete(r.id)}
              >
                <Button
                  danger
                  size="small"
                  type="text"
                  icon={<DeleteOutlined />}
                  loading={saving}
                  disabled={saving}
                />
              </Popconfirm>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Drawer
      title={item ? `Presentaciones – ${item.name}` : "Presentaciones"}
      open={open}
      onClose={onClose}
      width={960}
      destroyOnClose
    >
      {!item ? (
        <div style={{ opacity: 0.7 }}>Selecciona un insumo.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PresentationEditModal
            open={editOpen}
            restaurantId={restaurantId}
            item={item}
            units={units}
            row={editing}
            isFirstPresentation={(rows?.length ?? 0) === 0}
            onClose={() => {
              setEditOpen(false);
              setEditing(null);
            }}
            onSaved={async () => {
              await load();
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setEditOpen(true);
              }}
            >
              Nueva presentación
            </Button>
          </div>

          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      )}
    </Drawer>
  );
}

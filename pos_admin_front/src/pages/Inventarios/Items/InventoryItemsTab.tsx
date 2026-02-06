import { useEffect, useMemo, useState } from "react";
import { Button, Input, Popconfirm, Space, Table, Tag, Tooltip, message } from "antd";
import { AppstoreOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  InventoryGroupRow,
  InventoryItemRow,
  MeasurementUnitRow,
  deactivateInventoryItem,
  listInventoryGroups,
  listInventoryItems,
  listMeasurementUnits,
} from "@/lib/api_inventory";
import InventoryItemFormDrawer from "./InventoryItemFormDrawer";
import ItemPresentationsDrawer from "./ItemPresentationsDrawer";

type Props = { restaurantId: number };

export default function InventoryItemsTab({ restaurantId }: Props) {
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [groups, setGroups] = useState<InventoryGroupRow[]>([]);
  const [units, setUnits] = useState<MeasurementUnitRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItemRow | null>(null);

  const [presentationsOpen, setPresentationsOpen] = useState(false);
  const [presentationsItem, setPresentationsItem] = useState<InventoryItemRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function reload(nextQ?: string) {
    setLoading(true);
    try {
      const [g, u, it] = await Promise.all([
        listInventoryGroups(restaurantId),
        listMeasurementUnits(),
        listInventoryItems(restaurantId, nextQ ?? q),
      ]);
      setGroups(g);
      setUnits(u);
      setItems(it);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando insumos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function handleDelete(item: InventoryItemRow) {
    setDeletingId(item.id);
    try {
      await deactivateInventoryItem(restaurantId, item.id);
      message.success("Insumo desactivado");
      await reload();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.startsWith("409")) {
        message.warning("No se puede desactivar porque ya se usó en compras o conteos.");
      } else {
        message.error(e?.message ?? "Error desactivando insumo");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnsType<InventoryItemRow> = useMemo(
    () => [
      { title: "Código", dataIndex: "code", width: 180 },
      { title: "Nombre", dataIndex: "name" },
      {
        title: "Grupo",
        render: (_, r) => r.group?.name ?? (r.groupId ? String(r.groupId) : "-"),
      },
      {
        title: "Unidad base",
        render: (_, r) => r.unit?.code ?? (r.unitId ? String(r.unitId) : "-"),
        width: 120,
      },
      {
        title: "Tipo",
        dataIndex: "kind",
        width: 120,
        render: (v) => <Tag>{String(v ?? "raw")}</Tag>,
      },
      {
        title: "Creado",
        dataIndex: "createdAt",
        width: 160,
        render: (v) => (v ? new Date(String(v)).toLocaleDateString("es-MX") : "—"),
      },
      {
        title: "Activo",
        dataIndex: "isActive",
        width: 90,
        render: (v) => (v === false ? <Tag color="red">No</Tag> : <Tag color="green">Sí</Tag>),
      },
      {
        title: "Acciones",
        width: 260,
        render: (_, r) => (
          <Space>
            <Tooltip title="Editar insumo">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(r);
                  setDrawerOpen(true);
                }}
              />
            </Tooltip>
            <Tooltip title="Presentaciones">
              <Button
                size="small"
                type="text"
                icon={<AppstoreOutlined />}
                onClick={() => {
                  setPresentationsItem(r);
                  setPresentationsOpen(true);
                }}
              />
            </Tooltip>
            <Popconfirm
              title="¿Desactivar insumo?"
              description="Se ocultará del listado y ya no se podrá usar."
              okText="Desactivar"
              cancelText="Cancelar"
              onConfirm={() => handleDelete(r)}
            >
              <Tooltip title="Desactivar insumo">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletingId === r.id}
                  disabled={deletingId === r.id}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap>
        <Input.Search
          placeholder="Buscar por código o nombre…"
          allowClear
          style={{ width: 360 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={(value) => reload(value)}
        />
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          Nuevo insumo
        </Button>

        <Button onClick={() => reload()}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 20 }}
      />

      <InventoryItemFormDrawer
        open={drawerOpen}
        restaurantId={restaurantId}
        groups={groups}
        units={units}
        item={editing}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSaved={(saved) => {
          const wasEdit = !!editing?.id;

          if (wasEdit) {
            setDrawerOpen(false);
            setEditing(null);
            reload();
            return;
          }

          // flujo nuevo: al crear, mantenemos el drawer abierto para fotos y abrimos presentaciones
          setEditing(saved);
          setDrawerOpen(true);
          reload();

          setPresentationsItem(saved);
          setPresentationsOpen(true);
        }}
      />

      <ItemPresentationsDrawer
        open={presentationsOpen}
        restaurantId={restaurantId}
        item={presentationsItem}
        units={units}
        onClose={() => setPresentationsOpen(false)}
      />
    </div>
  );
}

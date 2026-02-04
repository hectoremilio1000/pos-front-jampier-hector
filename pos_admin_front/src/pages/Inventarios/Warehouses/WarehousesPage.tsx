import { useEffect, useState } from "react";
import { Button, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { WarehouseRow, listWarehouses } from "@/lib/api_inventory";
import WarehouseFormModal from "./WarehouseFormModal";

export default function WarehousesPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await listWarehouses(restaurantId);
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando almacenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<WarehouseRow> = [
    { title: "Nombre", dataIndex: "name" },
    { title: "Descripción", dataIndex: "description" },
    { title: "Activo", dataIndex: "isActive", width: 90, render: (v) => (v === false ? <Tag color="red">No</Tag> : <Tag color="green">Sí</Tag>) },
    {
      title: "Acciones",
      width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(r); setOpen(true); }}>Editar</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>Nuevo almacén</Button>
        <Button onClick={load}>Refrescar</Button>
      </Space>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />

      <WarehouseFormModal
        open={open}
        restaurantId={restaurantId}
        warehouse={editing}
        onClose={() => setOpen(false)}
        onSaved={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

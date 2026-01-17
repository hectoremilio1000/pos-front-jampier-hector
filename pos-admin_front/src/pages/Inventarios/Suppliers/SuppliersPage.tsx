import { useEffect, useMemo, useState } from "react";
import { Button, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { SupplierRow, SupplierTypeRow, listSuppliers, listSupplierTypes } from "@/lib/api_inventory";
import SupplierFormModal from "./SupplierFormModal";
import SupplierMarketsTab from "./SupplierMarketsTab";

function SuppliersList({ restaurantId }: { restaurantId: number }) {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [types, setTypes] = useState<SupplierTypeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);

  async function loadTypes() {
    const t = await listSupplierTypes();
    setTypes(t);
  }

  async function load() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([listSupplierTypes(), listSuppliers(restaurantId)]);
      setTypes(t);
      setRows(s);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  const columns: ColumnsType<SupplierRow> = [
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Tipo",
      render: (_, r) => {
        const t = r.supplierType ?? (r.supplierTypeId ? typeById.get(r.supplierTypeId) : null);
        return t ? `${t.code} — ${t.description ?? ""}`.trim() : "-";
      },
      width: 220,
    },
    {
      title: "Acciones",
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nuevo proveedor
        </Button>
        <Button onClick={load}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
      />

      <SupplierFormModal
        onRefreshTypes={loadTypes}
        open={formOpen}
        restaurantId={restaurantId}
        supplier={editing}
        supplierTypes={types}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />
    </div>
  );
}

export default function SuppliersPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  return (
    <Tabs
      defaultActiveKey="mercados"
      items={[
        {
          key: "mercados",
          label: "Mercados",
          children: <SupplierMarketsTab restaurantId={restaurantId} />,
        },
        {
          key: "proveedores",
          label: "Proveedores",
          children: <SuppliersList restaurantId={restaurantId} />,
        },
      ]}
    />
  );
}

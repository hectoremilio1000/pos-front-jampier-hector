import { useEffect, useState } from "react";
import { Button, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SupplierMarketRow } from "@/lib/api_inventory";
import { listSupplierMarkets } from "@/lib/api_inventory";
import SupplierMarketFormModal from "./SupplierMarketFormModal";
import SupplierMarketSuppliersDrawer from "./SupplierMarketSuppliersDrawer";

type Props = {
  restaurantId: number;
};

export default function SupplierMarketsTab({ restaurantId }: Props) {
  const [rows, setRows] = useState<SupplierMarketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierMarketRow | null>(null);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [marketForSuppliers, setMarketForSuppliers] = useState<SupplierMarketRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await listSupplierMarkets(restaurantId);
      setRows(r || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando mercados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<SupplierMarketRow> = [
    { title: "Nombre", dataIndex: "name" },
    { title: "Activo", dataIndex: "isActive", width: 90, render: (v) => (v === false ? "No" : "Sí") },
    {
      title: "Acciones",
      width: 220,
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
          <Button
            size="small"
            onClick={() => {
              setMarketForSuppliers(r);
              setSuppliersOpen(true);
            }}
          >
            Proveedores
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
          Nuevo mercado
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

      <SupplierMarketFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
        restaurantId={restaurantId}
        market={editing}
      />

      <SupplierMarketSuppliersDrawer
        open={suppliersOpen}
        onClose={() => setSuppliersOpen(false)}
        restaurantId={restaurantId}
        market={marketForSuppliers}
      />
    </div>
  );
}

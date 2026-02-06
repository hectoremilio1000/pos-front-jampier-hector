import { useEffect, useState } from "react";
import { Button, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { InventoryPresentationRow, listInventoryPresentations } from "@/lib/api_inventory";

export default function PresentationsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InventoryPresentationRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(nextQ?: string) {
    setLoading(true);
    try {
      const r = await listInventoryPresentations(restaurantId, { q: nextQ ?? q });
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando presentaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<InventoryPresentationRow> = [
    {
      title: "Insumo",
      render: (_, r) => {
        const it = (r as any).item; // por si TS aún no se actualiza
        if (it?.code || it?.name) return `${it.code} — ${it.name}`;
        return `#${r.inventoryItemId}`;
      },
    },

    { title: "Presentación", dataIndex: "name" },
    { title: "Contenido (base)", dataIndex: "contentInBaseUnit", width: 140 },
    {
      title: "Unidad",
      render: (_, r) =>
        r.presentationUnit?.code ?? (r.presentationUnitId ? String(r.presentationUnitId) : "-"),
      width: 120,
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      render: (v) => (v === false ? "No" : "Sí"),
      width: 90,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap>
        <Input.Search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={(v) => load(v)}
          allowClear
          placeholder="Buscar presentación…"
          style={{ width: 360 }}
        />
        <Button onClick={() => load()}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}

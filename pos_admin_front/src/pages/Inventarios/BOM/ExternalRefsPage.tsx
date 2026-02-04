import { useEffect, useState } from "react";
import { Button, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { ExternalRefRow, listExternalRefs } from "@/lib/api_inventory";

export default function ExternalRefsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<ExternalRefRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await listExternalRefs(restaurantId);
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando external refs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const cols: ColumnsType<ExternalRefRow> = [
    { title: "Tipo", dataIndex: "entityType", width: 160 },
    { title: "Entity ID", dataIndex: "entityId", width: 120 },
    { title: "Sistema", dataIndex: "externalSystem", width: 160 },
    { title: "External ID", dataIndex: "externalId" },
    { title: "Creado", dataIndex: "createdAt", width: 180 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <Space>
        <Button onClick={load} loading={loading}>Refrescar</Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={cols} dataSource={rows} pagination={{ pageSize: 20 }} />
      <div style={{ opacity: 0.65 }}>
        * Scaffold. Si tu controlador usa filtros (entityType, externalSystem, etc.), dime la firma y lo extendemos.
      </div>
    </div>
  );
}

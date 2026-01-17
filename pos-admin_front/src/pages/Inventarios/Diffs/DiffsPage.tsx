import { useEffect, useMemo, useState } from "react";
import { Button, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { StockCountDetail, StockCountItemRow, StockCountRow, getStockCount, listStockCounts } from "@/lib/api_inventory";

export default function DiffsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [counts, setCounts] = useState<StockCountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StockCountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadCounts() {
    setLoading(true);
    try {
      const r = await listStockCounts(restaurantId);
      const closed = r.filter((c) => String(c.status).toLowerCase() === "closed");
      setCounts(closed);
      // si no hay seleccionado, selecciona el primero
      if (!selectedId && closed.length) setSelectedId(closed[0].id);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando conteos cerrados");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: number) {
    setDetailLoading(true);
    try {
      const d = await getStockCount(restaurantId, id);
      setDetail(d);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando detalle del conteo");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, restaurantId]);

  const diffRows = useMemo(() => {
    const items = detail?.items ?? [];
    return items.filter((it) => (Number(it.differenceQtyBase ?? 0) || 0) !== 0);
  }, [detail]);

  const totalCost = useMemo(() => {
    return diffRows.reduce((acc, it) => acc + (Number(it.differenceTotalCost ?? 0) || 0), 0);
  }, [diffRows]);

  const countCols: ColumnsType<StockCountRow> = [
    { title: "#", dataIndex: "id", width: 70 },
    { title: "Nombre", dataIndex: "name" },
    { title: "Almacén", dataIndex: "warehouseId", width: 110 },
    { title: "Conteo", dataIndex: "countAt", width: 180 },
    { title: "Cerrado", dataIndex: "closedAt", width: 180 },
    { title: "Status", dataIndex: "status", width: 120, render: (v) => <Tag>{String(v)}</Tag> },
  ];

  const diffCols: ColumnsType<StockCountItemRow> = [
    {
      title: "Insumo",
      render: (_, r) => (r.inventoryItem ? `${r.inventoryItem.code} — ${r.inventoryItem.name}` : String(r.inventoryItemId)),
    },
    { title: "Presentación", render: (_, r) => r.presentation?.name ?? String(r.presentationId), width: 180 },
    { title: "Teórico (base)", dataIndex: "theoreticalQtyBase", width: 140 },
    { title: "Contado (base)", dataIndex: "countedQtyBase", width: 140 },
    {
      title: "Diferencia (base)",
      dataIndex: "differenceQtyBase",
      width: 150,
      render: (v) => {
        const n = Number(v ?? 0) || 0;
        return <Tag color={n > 0 ? "green" : "red"}>{n}</Tag>;
      },
    },
    {
      title: "Costo dif.",
      dataIndex: "differenceTotalCost",
      width: 140,
      render: (v) => (Number(v ?? 0) || 0).toLocaleString(undefined, { style: "currency", currency: "MXN" }),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Space>
        <Button onClick={loadCounts} loading={loading}>Refrescar</Button>
        {detail && (
          <Typography.Text>
            Total diferencias (costo):{" "}
            <b>{totalCost.toLocaleString(undefined, { style: "currency", currency: "MXN" })}</b>
          </Typography.Text>
        )}
      </Space>

      <Typography.Title level={5} style={{ margin: 0 }}>
        Conteos cerrados
      </Typography.Title>

      <Table
        rowKey="id"
        loading={loading}
        columns={countCols}
        dataSource={counts}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedId ? [selectedId] : [],
          onChange: (keys) => setSelectedId(Number(keys[0])),
        }}
      />

      <Typography.Title level={5} style={{ margin: 0 }}>
        Diferencias – Conteo #{selectedId ?? "—"}
      </Typography.Title>

      <Table
        rowKey="id"
        loading={detailLoading}
        columns={diffCols}
        dataSource={diffRows}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}

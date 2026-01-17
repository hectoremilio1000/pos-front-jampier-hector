import { useEffect, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { StockCountRow, closeStockCount, deleteStockCount, listStockCounts } from "@/lib/api_inventory";
import StockCountFormModal from "./StockCountFormModal";
import StockCountDetailDrawer from "./StockCountDetailDrawer";

export default function CountsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<StockCountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<StockCountRow | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await listStockCounts(restaurantId);
      const sorted = (r || []).slice().sort((a, b) => {
        const aTime = a.startedAt ? dayjs(a.startedAt).valueOf() : 0;
        const bTime = b.startedAt ? dayjs(b.startedAt).valueOf() : 0;
        return bTime - aTime;
      });
      setRows(sorted);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando conteos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<StockCountRow> = [
    {
      title: "Fecha de conteo",
      dataIndex: "startedAt",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Nombre del conteo",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      render: (_, r) => r.name ?? r.notes ?? "—",
    },
    {
      title: "Almacén",
      width: 140,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    {
      title: "Cerrado el",
      dataIndex: "finishedAt",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v) => {
        const s = String(v ?? "");
        const label =
          s === "in_progress" ? "En progreso" : s === "closed" ? "Cerrado" : s === "cancelled" ? "Cancelado" : s || "—";
        return <Tag>{label}</Tag>;
      },
    },
    {
      title: "Acciones",
      width: 160,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelected(r);
              setDetailOpen(true);
            }}
          >
            Ver detalle
          </Button>
          {String(r.status) !== "closed" ? (
            <Popconfirm
              title="¿Cerrar conteo?"
              okText="Cerrar"
              cancelText="Cancelar"
              onConfirm={async () => {
                try {
                  setClosingId(r.id);
                  await closeStockCount(restaurantId, r.id);
                  message.success("Conteo cerrado");
                  load();
                } catch (e: any) {
                  message.error(e?.message ?? "Error cerrando conteo");
                } finally {
                  setClosingId(null);
                }
              }}
            >
              <Button size="small" type="primary" loading={closingId === r.id}>
                Cerrar
              </Button>
            </Popconfirm>
          ) : null}
          {(() => {
            const hasItems = Number(r.itemsCount ?? 0) > 0;
            const isClosed = String(r.status) === "closed";
            const canDelete = !isClosed && !hasItems;
            const reason = canDelete
              ? ""
              : isClosed
                ? "No se puede eliminar: conteo cerrado"
                : "No se puede eliminar: tiene items";
            return (
              <Popconfirm
                title="¿Eliminar conteo?"
                okText="Eliminar"
                cancelText="Cancelar"
                onConfirm={async () => {
                  try {
                    await deleteStockCount(restaurantId, r.id);
                    message.success("Conteo eliminado");
                    load();
                  } catch (e: any) {
                    message.error(e?.message ?? "Error eliminando conteo");
                  }
                }}
                disabled={!canDelete}
              >
                <Tooltip title={reason}>
                  <Button size="small" danger disabled={!canDelete}>
                    Eliminar
                  </Button>
                </Tooltip>
              </Popconfirm>
            );
          })()}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Nuevo conteo físico
        </Button>
        <Button onClick={load}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 950 }}
      />

      <StockCountFormModal
        open={createOpen}
        restaurantId={restaurantId}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
      />

      <StockCountDetailDrawer
        open={detailOpen}
        restaurantId={restaurantId}
        countId={selected?.id ?? null}
        onClose={() => setDetailOpen(false)}
        onUpdated={() => load()}
      />
    </div>
  );
}

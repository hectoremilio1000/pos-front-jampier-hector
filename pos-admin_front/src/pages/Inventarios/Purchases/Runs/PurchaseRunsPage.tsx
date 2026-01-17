// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/Runs/PurchaseRunsPage.tsx

import { useEffect, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, Tooltip, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate, useOutletContext } from "react-router-dom";
import { PurchaseRunRow, cancelPurchaseRun, listPurchaseRuns } from "@/lib/api_inventory";
import { InventariosOutletContext } from "../..";
import { runStatusTagColor, stripRunNotes } from "../purchaseUi";

type Props = {
  refreshKey?: number;
};

export default function PurchaseRunsPage({ refreshKey }: Props) {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;
  const nav = useNavigate();

  const [rows, setRows] = useState<PurchaseRunRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await listPurchaseRuns(restaurantId);
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando viajes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(run: PurchaseRunRow) {
    try {
      await cancelPurchaseRun(restaurantId, run.id);
      message.success("Viaje cancelado");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "No se pudo cancelar el viaje");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, refreshKey]);

  const visibleRows = rows.filter(
    (r) => String(r.status ?? "").toLowerCase() !== "cancelled"
  );

  function getCancelState(run: PurchaseRunRow) {
    const status = String(run.status ?? "").toLowerCase();
    if (status === "closed") return { disabled: true, reason: "No se puede cancelar: viaje cerrado" };
    if (status === "cancelled")
      return { disabled: true, reason: "No se puede cancelar: ya cancelado" };

    const ordersCount = Number(run.purchaseOrdersCount ?? 0);
    const requestsCount = Number(run.stockRequestsCount ?? 0);
    if (ordersCount + requestsCount > 0) {
      return { disabled: true, reason: "No se puede cancelar: tiene pedidos" };
    }
    return { disabled: false, reason: "Cancelar viaje" };
  }

  const columns: ColumnsType<PurchaseRunRow> = [
    { title: "Run", dataIndex: "runCode", width: 160, render: (v) => <code>{v}</code> },
    { title: "Título", dataIndex: "title" },
    {
      title: "Fecha",
      dataIndex: "runAt",
      width: 180,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      render: (v) => <Tag color={runStatusTagColor(v)}>{String(v ?? "—")}</Tag>,
    },
    {
      title: "Notas",
      dataIndex: "notes",
      render: (v) => stripRunNotes(v),
    },
    {
      title: "Acciones",
      width: 220,
      render: (_, r) => {
        const cancelState = getCancelState(r);
        return (
          <Space>
            <Button size="small" type="primary" onClick={() => nav(`../viajes/${r.id}`)}>
              Abrir checklist
            </Button>
            <Tooltip title={cancelState.reason}>
              <span>
                <Popconfirm
                  title="¿Cancelar viaje?"
                  description="Solo se puede cancelar si no tiene pedidos."
                  okText="Cancelar viaje"
                  cancelText="Cerrar"
                  onConfirm={() => handleCancel(r)}
                  disabled={cancelState.disabled}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={cancelState.disabled}
                  />
                </Popconfirm>
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button onClick={load}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={visibleRows}
        pagination={{ pageSize: 20 }}
      />

    </div>
  );
}

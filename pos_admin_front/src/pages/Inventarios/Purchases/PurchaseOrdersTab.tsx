// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/PurchaseOrdersTab.tsx

import { useEffect, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { PurchaseOrderRow, deletePurchaseOrder, listPurchaseOrders } from "@/lib/api_inventory";
import PurchaseOrderFormDrawer from "./PurchaseOrderFormDrawer";
import PurchaseReceiveModal from "./PurchaseReceiveModal";
import PurchaseOrderItemsDrawer from "./OrderItems/PurchaseOrderItemsDrawer";
import { getOrderOrigin, orderOriginTagColor, orderStatusTagColor } from "./purchaseUi";

type Props = {
  refreshKey?: number;
};

export default function PurchaseOrdersTab({ refreshKey }: Props) {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrderRow | null>(null);

  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsOrderId, setItemsOrderId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await listPurchaseOrders(restaurantId);
      setRows((r || []).filter((row) => !row.purchaseRunId));
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando compras");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, refreshKey]);

  function getDeleteDisabledReason(order: PurchaseOrderRow) {
    const itemsCount = Number(order.itemsCount ?? 0);
    if (order.status && order.status !== "draft") {
      return "Solo se puede borrar en borrador";
    }
    if (order.receivedAt) {
      return "No se puede borrar una orden recibida";
    }
    if (itemsCount > 0) {
      return "Primero elimina los productos";
    }
    return null;
  }

  async function handleDelete(order: PurchaseOrderRow) {
    setDeletingId(order.id);
    try {
      await deletePurchaseOrder(restaurantId, order.id);
      message.success("Orden eliminada");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando orden");
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnsType<PurchaseOrderRow> = [
    { title: "#", dataIndex: "orderNumber", width: 90, render: (v, r) => v ?? r.id },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (v) => <Tag color={orderStatusTagColor(v)}>{String(v ?? "—")}</Tag>,
    },
    {
      title: "Origen",
      width: 170,
      render: (_, r) => {
        const origin = getOrderOrigin(r);
        return <Tag color={orderOriginTagColor(origin.key)}>{origin.label}</Tag>;
      },
    },
    {
      title: "Fecha de entrega",
      dataIndex: "applicationDate",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Recibido",
      dataIndex: "receivedAt",
      width: 180,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Proveedor",
      width: 220,
      render: (_, r) => r.supplier?.name ?? (r.supplierId ? `#${r.supplierId}` : "—"),
    },
    {
      title: "Almacén",
      width: 180,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    { title: "Referencia", dataIndex: "reference" },
    {
      title: "Acciones",
      width: 260,
      render: (_, r) => {
        const deleteReason = getDeleteDisabledReason(r);
        const deleteDisabled = Boolean(deleteReason);

        return (
          <Space>
            <Button
              size="small"
              onClick={() => {
                setSelected(r);
                setDrawerOpen(true);
              }}
            >
              Editar
            </Button>
            <Button
              size="small"
              onClick={() => {
                setSelected(r);
                setReceiveOpen(true);
              }}
            >
              {getOrderOrigin(r).key === "comisariato"
                ? "Registrar salida"
                : "Recibir compra"}
            </Button>
            {deleteDisabled ? (
              <Tooltip title={deleteReason}>
                <span>
                  <Button
                    danger
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled
                  />
                </span>
              </Tooltip>
            ) : (
              <Tooltip title="Eliminar orden">
                <Popconfirm
                  title="¿Eliminar orden?"
                  description="Solo se puede borrar si está en borrador y sin productos."
                  okText="Eliminar"
                  cancelText="Cancelar"
                  onConfirm={() => handleDelete(r)}
                >
                  <Button
                    danger
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    loading={deletingId === r.id}
                  />
                </Popconfirm>
              </Tooltip>
            )}
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
        dataSource={rows}
        pagination={{ pageSize: 20 }}
      />

      <PurchaseOrderFormDrawer
        key={selected?.id ?? "new"} // ✅ remount entre nuevo/editar
        open={drawerOpen}
        restaurantId={restaurantId}
        order={selected}
        purchaseRunId={null}
        onOpenItems={(id) => {
          setDrawerOpen(false);
          setSelected(null);

          // ✅ refresca tabla de órdenes (para que aparezca la compra recién creada/editada)
          load();

          // ✅ abre capturador de productos
          setItemsOrderId(id);
          setItemsOpen(true);
        }}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onSaved={() => {
          setDrawerOpen(false);
          setSelected(null);
          load();
        }}
      />

      <PurchaseReceiveModal
        open={receiveOpen}
        restaurantId={restaurantId}
        order={selected}
        onClose={() => {
          setReceiveOpen(false);
          setSelected(null);
        }}
        onSaved={() => {
          setReceiveOpen(false);
          setSelected(null);
          load();
        }}
      />

      {/* ✅ Drawer de captura de productos */}
      <PurchaseOrderItemsDrawer
        open={itemsOpen}
        restaurantId={restaurantId}
        purchaseOrderId={itemsOrderId}
        onClose={() => {
          setItemsOpen(false);
          setItemsOrderId(null);
        }}
        onDone={() => {
          load();
        }}
      />
    </div>
  );
}

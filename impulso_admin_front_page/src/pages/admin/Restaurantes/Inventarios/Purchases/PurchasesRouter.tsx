// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/PurchasesRouter.tsx

import { Button, Modal, Space, Tabs, Tooltip, Typography } from "antd";
import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import PurchaseOrdersTab from "./PurchaseOrdersTab";
import PurchaseRunsPage from "./Runs/PurchaseRunsPage";
import PurchaseRunDetailPage from "./Runs/PurchaseRunDetailPage";
import PurchaseRunFormModal from "./Runs/PurchaseRunFormModal";
import PurchaseOrderFormDrawer from "./PurchaseOrderFormDrawer";
import PurchaseOrderItemsDrawer from "./OrderItems/PurchaseOrderItemsDrawer";
import type { InventariosOutletContext } from "../index";
import { getRunType } from "./purchaseUi";

function activeKey(pathname: string) {
  return pathname.includes("/compras/viajes") ? "viajes" : "ordenes";
}

export default function PurchasesRouter() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { slug } = useParams();
  const restaurantId = restaurant.id;

  const [ctaOpen, setCtaOpen] = useState(false);
  const [runCreateOpen, setRunCreateOpen] = useState(false);
  const [orderCreateOpen, setOrderCreateOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsOrderId, setItemsOrderId] = useState<number | null>(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);

  const key = activeKey(pathname);

  // ruta base absoluta (evita concatenación infinita)
  const base = `/admin/restaurantes/${slug}/inventario/compras`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button type="primary" onClick={() => setCtaOpen(true)}>
          Nuevo surtido
        </Button>
      </Space>

      <Tabs
        activeKey={key}
        onChange={(nextKey) => {
          // nextKey es "ordenes" o "viajes"
          nav(`${base}/${nextKey}`);
        }}
        items={[
          {
            key: "viajes",
            label: (
              <Tooltip title="Surtidos/Viajes: checklist para surtir desde comisariato o múltiples proveedores.">
                <span>Surtidos/Viajes</span>
              </Tooltip>
            ),
          },
          {
            key: "ordenes",
            label: (
              <Tooltip title="Órdenes sueltas a proveedores: pedidos que generan factura/recepción.">
                <span>Órdenes sueltas a proveedores</span>
              </Tooltip>
            ),
          },
        ]}
      />

      <Routes>
        <Route path="/" element={<Navigate to="viajes" replace />} />
        <Route path="ordenes" element={<PurchaseOrdersTab refreshKey={ordersRefreshKey} />} />
        <Route path="viajes" element={<PurchaseRunsPage refreshKey={runsRefreshKey} />} />
        <Route path="viajes/:runId" element={<PurchaseRunDetailPage />} />
      </Routes>

      <Modal
        title="¿Origen del surtido?"
        open={ctaOpen}
        onCancel={() => setCtaOpen(false)}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              Voy a surtir (comisariato/tiendas)
            </Typography.Title>
            <Typography.Paragraph style={{ margin: "6px 0 12px 0" }}>
              Arma un viaje/checklist para surtir desde comisariato o varias tiendas. Si algo falta,
              podrás convertirlo a compra a proveedor.
            </Typography.Paragraph>
            <Button
              block
              onClick={() => {
                setCtaOpen(false);
                setRunCreateOpen(true);
              }}
            >
              Nuevo viaje
            </Button>
          </div>

          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              Voy a comprar directo a proveedor
            </Typography.Title>
            <Typography.Paragraph style={{ margin: "6px 0 12px 0" }}>
              Crea una orden directa al proveedor para recibir en el almacén destino.
            </Typography.Paragraph>
            <Button
              type="primary"
              block
              onClick={() => {
                setCtaOpen(false);
                setOrderCreateOpen(true);
              }}
            >
              Crear orden
            </Button>
          </div>
        </div>
      </Modal>

      <PurchaseRunFormModal
        open={runCreateOpen}
        restaurantId={restaurantId}
        onClose={() => setRunCreateOpen(false)}
        onSaved={(created) => {
          setRunCreateOpen(false);
          setRunsRefreshKey((prev) => prev + 1);
          const runType = getRunType(created);
          const openOnCreate =
            runType === "ruta" ? "order" : runType === "comisariato" ? "stock" : null;
          if (openOnCreate) {
            nav(`${base}/viajes/${created.id}`, { state: { openOnCreate } });
            return;
          }
          nav(`${base}/viajes/${created.id}`);
        }}
      />

      <PurchaseOrderFormDrawer
        key="new-order"
        open={orderCreateOpen}
        restaurantId={restaurantId}
        order={null}
        purchaseRunId={null}
        onOpenItems={(id) => {
          setOrderCreateOpen(false);
          setOrdersRefreshKey((prev) => prev + 1);
          setItemsOrderId(id);
          setItemsOpen(true);
          if (key !== "ordenes") nav(`${base}/ordenes`);
        }}
        onClose={() => setOrderCreateOpen(false)}
        onSaved={() => {
          setOrderCreateOpen(false);
          setOrdersRefreshKey((prev) => prev + 1);
          if (key !== "ordenes") nav(`${base}/ordenes`);
        }}
      />

      <PurchaseOrderItemsDrawer
        open={itemsOpen}
        restaurantId={restaurantId}
        purchaseOrderId={itemsOrderId}
        onClose={() => {
          setItemsOpen(false);
          setItemsOrderId(null);
        }}
        onDone={() => {
          setOrdersRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}

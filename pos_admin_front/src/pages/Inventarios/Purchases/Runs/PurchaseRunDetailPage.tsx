// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/Runs/PurchaseRunDetailPage.tsx
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
  InputNumber,
  DatePicker,
  Table,
} from "antd";
import dayjs from "dayjs";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { InventariosOutletContext } from "../../index";
import {
  closePurchaseRun,
  deletePurchaseOrder,
  deleteStockRequest,
  fulfillStockRequest,
  getPurchaseOrder,
  getPurchaseRun,
  getStockRequest,
  PurchaseRunDetail,
  receivePurchaseOrder,
  reopenPurchaseRun,
  StockRequestRow,
} from "@/lib/api_inventory";
import PurchaseOrderFormDrawer from "../PurchaseOrderFormDrawer";
import PurchaseRunOrdersTable from "./PurchaseRunOrdersTable";
import type { PurchaseOrderRow } from "@/lib/api_inventory";
import PurchaseOrderItemsDrawer from "../OrderItems/PurchaseOrderItemsDrawer";
import { getRunType, runStatusTagColor, stripRunNotes } from "../purchaseUi";
import StockRequestFormDrawer from "../StockRequests/StockRequestFormDrawer";
import StockRequestItemsDrawer from "../StockRequests/StockRequestItemsDrawer";
import StockRequestsTable from "../StockRequests/StockRequestsTable";

export default function PurchaseRunDetailPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const { runId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const autoOpenRef = useRef(false);
  const openOnCreate = (location.state as { openOnCreate?: "order" | "stock" } | null)
    ?.openOnCreate;

  const [run, setRun] = useState<PurchaseRunDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRow | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsOrderId, setItemsOrderId] = useState<number | null>(null);
  const [addChoiceOpen, setAddChoiceOpen] = useState(false);
  const [stockDrawerOpen, setStockDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockRequestRow | null>(null);
  const [stockItemsOpen, setStockItemsOpen] = useState(false);
  const [stockItemsRequestId, setStockItemsRequestId] = useState<number | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printRequests, setPrintRequests] = useState<StockRequestRow[] | null>(null);
  const [printOrders, setPrintOrders] = useState<PurchaseOrderRow[] | null>(null);
  const [printReady, setPrintReady] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveOrders, setReceiveOrders] = useState<PurchaseOrderRow[]>([]);
  const [receiveRequests, setReceiveRequests] = useState<StockRequestRow[]>([]);
  const [receiveOrderEnabled, setReceiveOrderEnabled] = useState<Record<number, boolean>>({});
  const [receiveRequestEnabled, setReceiveRequestEnabled] = useState<Record<number, boolean>>({});
  const [orderReceivedQty, setOrderReceivedQty] = useState<Record<number, number>>({});
  const [requestFulfilledQty, setRequestFulfilledQty] = useState<Record<number, number>>({});
  const [receiveAt, setReceiveAt] = useState(() => dayjs());

  async function load() {
    if (!runId) return;
    setLoading(true);
    try {
      const r = await getPurchaseRun(restaurantId, Number(runId));
      setRun(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando viaje");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, runId]);

  useEffect(() => {
    if (!run || autoOpenRef.current || !openOnCreate) return;
    if (run.status === "closed" || run.status === "cancelled") return;
    autoOpenRef.current = true;

    if (openOnCreate === "order") {
      setSelectedOrder(null);
      setDrawerOpen(true);
    } else if (openOnCreate === "stock") {
      setSelectedRequest(null);
      setStockDrawerOpen(true);
    }

    nav(".", { replace: true, state: {} });
  }, [run, openOnCreate, nav]);

  async function closeRun() {
    if (!runId) return;
    try {
      await closePurchaseRun(restaurantId, Number(runId), { closedBy: "admin" });
      message.success("Viaje cerrado");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error cerrando viaje");
    }
  }

  async function reopenRun() {
    if (!runId) return;
    try {
      await reopenPurchaseRun(restaurantId, Number(runId));
      message.success("Viaje reabierto");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error reabriendo viaje");
    }
  }

  async function handlePrint() {
    if (!run) return;
    setPrintLoading(true);
    try {
      const requests = run.stockRequests || [];
      const orders = run.purchaseOrders || [];
      const details = await Promise.all(
        requests.map((r) => getStockRequest(restaurantId, r.id))
      );
      const orderDetails = await Promise.all(
        orders.map((o) => getPurchaseOrder(restaurantId, o.id))
      );
      setPrintRequests(details);
      setPrintOrders(orderDetails);
      setPrintReady(true);
    } catch (e: any) {
      message.error(e?.message ?? "Error preparando impresión");
    } finally {
      setPrintLoading(false);
    }
  }

  async function openReceiveModal() {
    if (!run) return;
    setReceiveOpen(true);
    setReceiveLoading(true);
    try {
      const orders = run.purchaseOrders || [];
      const requests = run.stockRequests || [];
      const orderDetails = (
        await Promise.all(orders.map((o) => getPurchaseOrder(restaurantId, o.id)))
      ).filter((o) => String(o.status) !== "cancelled");
      const requestDetails = (
        await Promise.all(requests.map((r) => getStockRequest(restaurantId, r.id)))
      ).filter((r) => String(r.status) !== "cancelled");

      const orderEnabledMap: Record<number, boolean> = {};
      const orderQtyMap: Record<number, number> = {};
      orderDetails.forEach((o) => {
        orderEnabledMap[o.id] = String(o.status) !== "received" && String(o.status) !== "cancelled";
        (o.items ?? []).forEach((it) => {
          orderQtyMap[it.id] = Number(it.receivedQty ?? it.quantity ?? 0);
        });
      });

      const requestEnabledMap: Record<number, boolean> = {};
      const requestQtyMap: Record<number, number> = {};
      requestDetails.forEach((r) => {
        requestEnabledMap[r.id] =
          String(r.status) !== "fulfilled" && String(r.status) !== "cancelled";
        (r.items ?? []).forEach((it) => {
          requestQtyMap[it.id] = Number(it.fulfilledQty ?? it.quantity ?? 0);
        });
      });

      setReceiveOrders(orderDetails);
      setReceiveRequests(requestDetails);
      setReceiveOrderEnabled(orderEnabledMap);
      setReceiveRequestEnabled(requestEnabledMap);
      setOrderReceivedQty(orderQtyMap);
      setRequestFulfilledQty(requestQtyMap);
      setReceiveAt(dayjs());
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando recibo");
    } finally {
      setReceiveLoading(false);
    }
  }

  async function handleReceiveSave() {
    if (!run) return;
    setReceiveLoading(true);
    try {
      const receivedAt = receiveAt.toISOString();
      const orderPromises = receiveOrders
        .filter((o) => receiveOrderEnabled[o.id])
        .map((o) =>
          receivePurchaseOrder(restaurantId, o.id, {
            receivedAt,
            items: (o.items ?? []).map((it) => ({
              id: it.id,
              receivedQty: Number(orderReceivedQty[it.id] ?? it.quantity ?? 0),
            })),
          })
        );

      const requestPromises = receiveRequests
        .filter((r) => receiveRequestEnabled[r.id])
        .map((r) =>
          fulfillStockRequest(restaurantId, r.id, {
            complete: true,
            fulfilledAt: receivedAt,
            items: (r.items ?? []).map((it) => ({
              id: it.id,
              fulfilledQty: Number(requestFulfilledQty[it.id] ?? it.quantity ?? 0),
            })),
          })
        );

      await Promise.all([...orderPromises, ...requestPromises]);
      message.success("Recibos actualizados");
      setReceiveOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando recibos");
    } finally {
      setReceiveLoading(false);
    }
  }

  async function handleDeleteOrder(order: PurchaseOrderRow) {
    try {
      await deletePurchaseOrder(restaurantId, Number(order.id));
      message.success("Orden eliminada");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando orden");
    }
  }

  async function handleDeleteRequest(row: StockRequestRow) {
    try {
      await deleteStockRequest(restaurantId, Number(row.id));
      message.success("Pedido eliminado");
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando pedido");
    }
  }

  useEffect(() => {
    if (!printReady) return;
    const timeout = window.setTimeout(() => {
      window.print();
      setPrintReady(false);
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [printReady]);

  if (!run) return <div style={{ opacity: 0.7 }}>{loading ? "Cargando…" : "No encontrado"}</div>;
  const notes = stripRunNotes(run.notes);
  const runType = getRunType(run);

  const isClosed = run.status === "closed";
  const showStockFirst = runType === "comisariato";

  const ordersSection = (
    <>
      <Typography.Title level={5} style={{ margin: "8px 0 0 0" }}>
        Pedidos a proveedores
      </Typography.Title>

      <PurchaseRunOrdersTable
        rows={(run.purchaseOrders || []).filter(
          (order) => String(order.status ?? "").toLowerCase() !== "cancelled"
        )}
        onEdit={(o) => {
          setSelectedOrder(o);
          setDrawerOpen(true);
        }}
        onOpenItems={(o) => {
          setSelectedOrder(o);
          setItemsOrderId(o.id);
          setItemsOpen(true);
        }}
        onDelete={handleDeleteOrder}
        disabledActions={isClosed}
      />
    </>
  );

  const stockSection = (
    <>
      <Typography.Title level={5} style={{ margin: "8px 0 0 0" }}>
        Pedidos al almacén
      </Typography.Title>
      <StockRequestsTable
        rows={(run.stockRequests || []).filter(
          (req) => String(req.status ?? "").toLowerCase() !== "cancelled"
        )}
        disabledActions={isClosed}
        onEdit={(r) => {
          if (isClosed) return;
          setSelectedRequest(r);
          setStockDrawerOpen(true);
        }}
        onOpenItems={(r) => {
          if (isClosed) return;
          setSelectedRequest(r);
          setStockItemsRequestId(r.id);
          setStockItemsOpen(true);
        }}
        onDelete={handleDeleteRequest}
      />
    </>
  );

  return (
    <>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body * { visibility: hidden !important; }
            .print-only, .print-only * { visibility: visible !important; }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
          .print-only h2 { font-size: 18px; margin: 0 0 4px 0; }
          .print-only h3 { font-size: 16px; font-weight: 700; margin: 12px 0 8px 0; }
        `}
      </style>

      <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card
          title={`${run.runCode} — ${run.title ?? "Viaje"}`}
          extra={
            <Space>
              <Tag color={runStatusTagColor(run.status)}>{run.status}</Tag>
              <Button onClick={() => nav("../viajes")}>Volver</Button>
              <Tooltip title={isClosed ? "" : "Cierra el viaje para imprimir"}>
                <Button onClick={handlePrint} loading={printLoading} disabled={!isClosed}>
                  PDF pedido
                </Button>
              </Tooltip>
              <Tooltip title={isClosed ? "" : "Cierra el viaje para registrar recibido"}>
                <Button onClick={openReceiveModal} disabled={!isClosed}>
                  Registrar recibido
                </Button>
              </Tooltip>
              <Button
                type="primary"
                disabled={isClosed}
                onClick={() => {
                  setSelectedOrder(null); // ✅ NUEVA compra, no edición
                  setAddChoiceOpen(true);
                }}
              >
                Agregar lista
              </Button>

              {isClosed ? (
                <Button type="primary" onClick={reopenRun}>
                  Reabrir viaje
                </Button>
              ) : (
                <Button danger onClick={closeRun}>
                  Cerrar viaje
                </Button>
              )}
            </Space>
          }
        >
        <Space direction="vertical">
          <div>
            <b>Fecha:</b> {dayjs(run.runAt).format("YYYY-MM-DD HH:mm")}
          </div>
          {notes ? (
            <div>
              <b>Notas:</b> {notes}
            </div>
          ) : null}
        </Space>
      </Card>

      {showStockFirst ? stockSection : ordersSection}
      {showStockFirst ? ordersSection : stockSection}

      <PurchaseOrderFormDrawer
        key={selectedOrder?.id ?? `new-${run.id}`} // ✅ remount entre nuevo/editar
        open={drawerOpen}
        restaurantId={restaurantId}
        order={selectedOrder}
        onOpenItems={(id) => {
          setDrawerOpen(false);
          setSelectedOrder(null);

          // ✅ refresca tabla del viaje (para que aparezca la compra recién creada/editada)
          load();

          // ✅ abre capturador de productos
          setItemsOrderId(id);
          setItemsOpen(true);
        }}
        purchaseRunId={run.id}
        defaultApplicationDate={run.runAt} // ✅ usa fecha del viaje
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onSaved={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
          load();
        }}
      />

      <StockRequestFormDrawer
        key={selectedRequest?.id ?? `stock-new-${run.id}`}
        open={stockDrawerOpen}
        restaurantId={restaurantId}
        request={selectedRequest}
        purchaseRunId={run.id}
        defaultRequestedAt={run.runAt}
        onOpenItems={(id) => {
          setStockDrawerOpen(false);
          setSelectedRequest(null);
          load();
          setStockItemsRequestId(id);
          setStockItemsOpen(true);
        }}
        onClose={() => {
          setStockDrawerOpen(false);
          setSelectedRequest(null);
        }}
        onSaved={() => {
          setStockDrawerOpen(false);
          setSelectedRequest(null);
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
          // ✅ por si agregaste líneas y quieres ver reflejado algo al cerrar
          load();
        }}
      />

      <StockRequestItemsDrawer
        open={stockItemsOpen}
        restaurantId={restaurantId}
        stockRequestId={stockItemsRequestId}
        onClose={() => {
          setStockItemsOpen(false);
          setStockItemsRequestId(null);
        }}
        onDone={() => {
          load();
        }}
      />

        <Modal
          title="¿Qué quieres agregar?"
          open={addChoiceOpen}
          onCancel={() => setAddChoiceOpen(false)}
          footer={null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Button
              block
              onClick={() => {
                setAddChoiceOpen(false);
                setSelectedRequest(null);
                setStockDrawerOpen(true);
              }}
            >
              Pedido al almacén (por área)
            </Button>
            <Button
              type="primary"
              block
              onClick={() => {
                setAddChoiceOpen(false);
                setDrawerOpen(true);
              }}
            >
              Compra a proveedor
            </Button>
          </div>
        </Modal>
      </div>

      <div className="print-only" style={{ display: "none", padding: 24 }}>
        <h2 style={{ marginBottom: 4 }}>{run.runCode}</h2>
        <div style={{ marginBottom: 8 }}>{run.title ?? "Viaje"}</div>
        <div style={{ marginBottom: 16 }}>
          <b>Fecha:</b> {dayjs(run.runAt).format("YYYY-MM-DD HH:mm")}
        </div>

        <h3 style={{ marginBottom: 8 }}>Pedidos a proveedores</h3>
        {(() => {
          const ordersForPrint = (printOrders ?? run.purchaseOrders ?? []).filter(
            (order) => order.status !== "cancelled"
          );
          if (ordersForPrint.length === 0) {
            return <div style={{ opacity: 0.7 }}>Sin pedidos</div>;
          }
          return ordersForPrint.map((order) => (
            <div key={order.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                #{order.orderNumber ?? order.id} — {order.supplier?.name ?? "Proveedor"} —{" "}
                {order.warehouse?.name ?? "Almacén"}
              </div>
              {order.items && order.items.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Presentación
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", width: 120 }}>
                        Cantidad
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", width: 180 }}>
                        Comentarios
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id}>
                        <td style={{ padding: "4px 0" }}>
                          {it.presentation?.name ?? `#${it.presentationId}`}
                        </td>
                        <td style={{ padding: "4px 0" }}>{it.quantity}</td>
                        <td style={{ padding: "4px 0" }}>&nbsp;</td>
                        <td style={{ padding: "4px 0" }}>{it.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ opacity: 0.7 }}>Sin productos</div>
              )}
            </div>
          ));
        })()}

        <h3 style={{ marginBottom: 8 }}>Pedidos al almacén</h3>
        {(() => {
          const requestsForPrint = printRequests ?? run.stockRequests ?? [];
          if (requestsForPrint.length === 0) {
            return <div style={{ opacity: 0.7 }}>Sin pedidos</div>;
          }
          return requestsForPrint.map((req) => (
            <div key={req.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                #{req.id} — {req.areaLabel ?? "Área"} — {req.warehouse?.name ?? "Almacén"}
              </div>
              {req.items && req.items.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        Presentación
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", width: 120 }}>
                        Cantidad
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", width: 180 }}>
                        Comentarios
                      </th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {req.items.map((it) => (
                      <tr key={it.id}>
                        <td style={{ padding: "4px 0" }}>
                          {it.presentation?.name ?? `#${it.presentationId}`}
                        </td>
                        <td style={{ padding: "4px 0" }}>{it.quantity}</td>
                        <td style={{ padding: "4px 0" }}>&nbsp;</td>
                        <td style={{ padding: "4px 0" }}>{it.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ opacity: 0.7 }}>Sin productos</div>
              )}
            </div>
          ));
        })()}
      </div>

      <Modal
        title="Registrar recibido del viaje"
        open={receiveOpen}
        onCancel={() => setReceiveOpen(false)}
        onOk={handleReceiveSave}
        okText="Guardar"
        confirmLoading={receiveLoading}
        width={980}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Fecha de recibido</div>
          <DatePicker
            showTime
            style={{ width: "100%" }}
            value={receiveAt}
            onChange={(v) => setReceiveAt(v ?? dayjs())}
          />
        </div>

        <Divider />

        <Typography.Title level={5} style={{ margin: "0 0 8px 0" }}>
          Proveedores
        </Typography.Title>
        {receiveOrders.length === 0 ? (
          <div style={{ opacity: 0.7, marginBottom: 16 }}>Sin órdenes a proveedores</div>
        ) : (
          receiveOrders.map((o) => (
            <div key={o.id} style={{ marginBottom: 16 }}>
              <Space style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={!!receiveOrderEnabled[o.id]}
                  onChange={(e) =>
                    setReceiveOrderEnabled((prev) => ({ ...prev, [o.id]: e.target.checked }))
                  }
                >
                  Incluir en este guardado · #{o.orderNumber ?? o.id} —{" "}
                  {o.supplier?.name ?? "Proveedor"}
                </Checkbox>
                <Tag>{o.status ?? "draft"}</Tag>
              </Space>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={o.items ?? []}
                columns={[
                  {
                    title: "Presentación",
                    render: (_, r) => r.presentation?.name ?? `#${r.presentationId}`,
                  },
                  { title: "Solicitado", dataIndex: "quantity", width: 120 },
                  {
                    title: "Recibido real",
                    width: 140,
                    render: (_, r) => (
                      <InputNumber
                        min={0}
                        value={orderReceivedQty[r.id]}
                        onChange={(v) =>
                          setOrderReceivedQty((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))
                        }
                        disabled={!receiveOrderEnabled[o.id]}
                        style={{ width: 120 }}
                      />
                    ),
                  },
                ]}
              />
            </div>
          ))
        )}

        <Divider />

        <Typography.Title level={5} style={{ margin: "0 0 8px 0" }}>
          Pedidos al almacén
        </Typography.Title>
        {receiveRequests.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Sin pedidos al almacén</div>
        ) : (
          receiveRequests.map((r) => (
            <div key={r.id} style={{ marginBottom: 16 }}>
              <Space style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={!!receiveRequestEnabled[r.id]}
                  onChange={(e) =>
                    setReceiveRequestEnabled((prev) => ({ ...prev, [r.id]: e.target.checked }))
                  }
                >
                  Incluir en este guardado · #{r.id} — {r.areaLabel ?? "Área"} —{" "}
                  {r.warehouse?.name ?? "Almacén"}
                </Checkbox>
                <Tag>{r.status ?? "draft"}</Tag>
              </Space>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={r.items ?? []}
                columns={[
                  {
                    title: "Presentación",
                    render: (_, it) => it.presentation?.name ?? `#${it.presentationId}`,
                  },
                  { title: "Solicitado", dataIndex: "quantity", width: 120 },
                  {
                    title: "Surtido real",
                    width: 140,
                    render: (_, it) => (
                      <InputNumber
                        min={0}
                        value={requestFulfilledQty[it.id]}
                        onChange={(v) =>
                          setRequestFulfilledQty((prev) => ({
                            ...prev,
                            [it.id]: Number(v ?? 0),
                          }))
                        }
                        disabled={!receiveRequestEnabled[r.id]}
                        style={{ width: 120 }}
                      />
                    ),
                  },
                ]}
              />
            </div>
          ))
        )}
      </Modal>
    </>
  );
}

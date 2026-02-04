// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/OrderItems/PurchaseOrderItemsDrawer.tsx
import { Drawer, Space, Button, InputNumber, message, Divider, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import type { InventoryPresentationRow, PurchaseOrderRow } from "@/lib/api_inventory";
import {
  addPurchaseOrderItem,
  deletePurchaseOrderItem,
  getPurchaseOrder,
  listPresentationSupplierCosts,
  updatePurchaseOrderItem,
} from "@/lib/api_inventory";
import PresentationSearch from "./PresentationSearch";
import OrderItemsTable from "./OrderItemsTable";

const { Text } = Typography;

type Props = {
  open: boolean;
  restaurantId: number;
  purchaseOrderId: number | null;
  onClose: () => void;
  onDone?: () => void; // para recargar listas afuera
};

export default function PurchaseOrderItemsDrawer({
  open,
  restaurantId,
  purchaseOrderId,
  onClose,
  onDone,
}: Props) {
  const [order, setOrder] = useState<PurchaseOrderRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedPres, setSelectedPres] = useState<InventoryPresentationRow | null>(null);
  const [qty, setQty] = useState<number | null>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const selectedPresIdRef = useRef<number | null>(null);

  async function load() {
    if (!purchaseOrderId) return;
    setLoading(true);
    try {
      const po = await getPurchaseOrder(restaurantId, purchaseOrderId);
      setOrder(po);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando compra");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setSelectedPres(null);
    setQty(1);
    setUnitPrice(0);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchaseOrderId, restaurantId]);

  async function addLine() {
    if (!purchaseOrderId) return;
    if (!selectedPres?.id) return message.error("Selecciona una presentación");
    if (!qty || qty <= 0) return message.error("Cantidad inválida");
    if (priceLoading) return;

    setAdding(true);
    try {
      const safeQty = Number(qty ?? 0);
      const payload = {
        presentationId: selectedPres.id,
        quantity: safeQty,
        unitPrice: unitPrice,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineSubtotal: Number(safeQty) * Number(unitPrice),
        lineTotal: Number(safeQty) * Number(unitPrice),
        notes: null,
      };

      await addPurchaseOrderItem(restaurantId, purchaseOrderId, payload);

      // reset inputs + recarga items reales desde backend (incluye preload presentation)
      setSelectedPres(null);
      setQty(1);
      setUnitPrice(0);

      message.success("Producto agregado");
      await load();
      onDone?.();
    } catch (e: any) {
      message.error(e?.message ?? "Error agregando producto");
    } finally {
      setAdding(false);
    }
  }

  async function updateLine(
    itemId: number,
    payload: { quantity?: number; unitPrice?: number; notes?: string | null }
  ) {
    if (!purchaseOrderId) return;
    setSavingItemId(itemId);
    try {
      await updatePurchaseOrderItem(restaurantId, purchaseOrderId, itemId, payload);
      message.success("Línea actualizada");
      await load();
      onDone?.();
    } catch (e: any) {
      message.error(e?.message ?? "Error actualizando línea");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteLine(itemId: number) {
    if (!purchaseOrderId) return;
    setDeletingItemId(itemId);
    try {
      await deletePurchaseOrderItem(restaurantId, purchaseOrderId, itemId);
      message.success("Línea eliminada");
      await load();
      onDone?.();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando línea");
    } finally {
      setDeletingItemId(null);
    }
  }

  const rows = order?.items ?? [];

  async function suggestUnitPrice(pres: InventoryPresentationRow, supplierId?: number | null) {
    setPriceLoading(true);
    let suggested =
      pres.detail?.standardCost ?? pres.detail?.lastCost ?? pres.detail?.averageCost ?? null;

    if (supplierId) {
      try {
        const costs = await listPresentationSupplierCosts(restaurantId, pres.id);
        const match = costs.find((c) => c.supplierId === supplierId);
        const supplierCost = match?.lastCost;
        if (supplierCost !== null && supplierCost !== undefined) suggested = supplierCost;
      } catch {
        // usa fallback por detalle
      }
    }

    setPriceLoading(false);
    return Number(suggested ?? 0);
  }

  return (
    <Drawer
      title={purchaseOrderId ? `Productos de compra #${purchaseOrderId}` : "Productos de compra"}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Cerrar</Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <Text type="secondary">
          Agrega líneas (presentación + cantidad). El precio se ajusta en la tabla y usa el costo
          del proveedor; si no existe, toma el costo estándar.
        </Text>

        <Divider style={{ margin: "12px 0" }} />

        <PresentationSearch
          restaurantId={restaurantId}
          supplierId={order?.supplierId ?? null}
          disabled={!order?.supplierId} // opcional: bloquea hasta elegir proveedor
          placeholder={
            order?.supplierId ? "Buscar presentación…" : "Selecciona un proveedor para filtrar…"
          }
          selected={selectedPres}
          onSelectedClear={() => setSelectedPres(null)}
          onSelect={(p) => {
            setSelectedPres(p);
            const baseSuggested = Number(
              p.detail?.standardCost ?? p.detail?.lastCost ?? p.detail?.averageCost ?? 0
            );
            setUnitPrice(baseSuggested);
            const presId = p.id;
            const supplierId = order?.supplierId ?? null;
            selectedPresIdRef.current = presId;
            suggestUnitPrice(p, supplierId).then((suggested) => {
              if (selectedPresIdRef.current !== presId) return;
              setUnitPrice(suggested);
            });
          }}
        />

        <Space style={{ width: "100%" }}>
          <InputNumber
            min={0.0001}
            value={qty}
            onChange={(v) => setQty(v === null ? null : Number(v))}
            placeholder="Cantidad"
          />
          <Button type="primary" loading={adding} onClick={addLine} disabled={!selectedPres}>
            Agregar
          </Button>
          {selectedPres ? (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Seleccionado: <b>{selectedPres.name}</b>
              <span style={{ marginLeft: 8 }}>
                {priceLoading ? "Cargando precio..." : `Precio sugerido: ${unitPrice}`}
              </span>
            </Text>
          ) : null}
        </Space>

        <Divider style={{ margin: "12px 0" }} />

        <OrderItemsTable
          rows={rows as any}
          loading={loading}
          savingItemId={savingItemId}
          deletingItemId={deletingItemId}
          onUpdate={updateLine}
          onDelete={deleteLine}
        />
      </Space>
    </Drawer>
  );
}

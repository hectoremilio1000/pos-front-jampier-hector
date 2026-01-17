import { Drawer, Space, Button, InputNumber, message, Divider, Typography } from "antd";
import { useEffect, useState } from "react";
import type { InventoryPresentationRow, StockRequestRow } from "@/lib/api_inventory";
import {
  addStockRequestItem,
  deleteStockRequestItem,
  getStockRequest,
  updateStockRequestItem,
} from "@/lib/api_inventory";
import PresentationSearchAny from "./PresentationSearchAny";
import StockRequestItemsTable from "./StockRequestItemsTable";

const { Text } = Typography;

type Props = {
  open: boolean;
  restaurantId: number;
  stockRequestId: number | null;
  onClose: () => void;
  onDone?: () => void;
};

export default function StockRequestItemsDrawer({
  open,
  restaurantId,
  stockRequestId,
  onClose,
  onDone,
}: Props) {
  const [request, setRequest] = useState<StockRequestRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedPres, setSelectedPres] = useState<InventoryPresentationRow | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [adding, setAdding] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  async function load() {
    if (!stockRequestId) return;
    setLoading(true);
    try {
      const row = await getStockRequest(restaurantId, stockRequestId);
      setRequest(row);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando pedido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setSelectedPres(null);
    setQty(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stockRequestId, restaurantId]);

  async function addLine() {
    if (!stockRequestId) return;
    if (!selectedPres?.id) return message.error("Selecciona una presentación");
    if (!qty || qty <= 0) return message.error("Cantidad inválida");

    setAdding(true);
    try {
      const payload = {
        presentationId: selectedPres.id,
        quantity: qty,
        notes: null,
      };

      await addStockRequestItem(restaurantId, stockRequestId, payload);

      setSelectedPres(null);
      setQty(1);

      message.success("Producto agregado");
      await load();
      onDone?.();
    } catch (e: any) {
      message.error(e?.message ?? "Error agregando producto");
    } finally {
      setAdding(false);
    }
  }

  async function updateLine(itemId: number, payload: { quantity?: number; notes?: string | null }) {
    if (!stockRequestId) return;
    setSavingItemId(itemId);
    try {
      await updateStockRequestItem(restaurantId, stockRequestId, itemId, payload);
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
    if (!stockRequestId) return;
    setDeletingItemId(itemId);
    try {
      await deleteStockRequestItem(restaurantId, stockRequestId, itemId);
      message.success("Línea eliminada");
      await load();
      onDone?.();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando línea");
    } finally {
      setDeletingItemId(null);
    }
  }

  const rows = request?.items ?? [];

  return (
    <Drawer
      title={stockRequestId ? `Productos de pedido #${stockRequestId}` : "Productos de pedido"}
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
          Agrega líneas (presentación + cantidad). Después podrás registrar la salida desde la tabla.
        </Text>

        <Divider style={{ margin: "12px 0" }} />

        <PresentationSearchAny
          restaurantId={restaurantId}
          placeholder="Buscar presentación…"
          selected={selectedPres}
          onSelectedClear={() => setSelectedPres(null)}
          onSelect={(p) => {
            setSelectedPres(p);
          }}
        />

        <Space style={{ width: "100%" }}>
          <InputNumber
            min={0.0001}
            value={qty}
            onChange={(v) => setQty(Number(v ?? 0))}
            placeholder="Cantidad"
          />
          <Button type="primary" loading={adding} onClick={addLine} disabled={!selectedPres}>
            Agregar
          </Button>
          {selectedPres ? (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Seleccionado: <b>{selectedPres.name}</b>
            </Text>
          ) : null}
        </Space>

        <Divider style={{ margin: "12px 0" }} />

        <StockRequestItemsTable
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

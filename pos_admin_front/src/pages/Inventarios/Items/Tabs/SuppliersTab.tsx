import { Button, InputNumber, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  deletePresentationSupplierCost,
  listPresentationSupplierCosts,
  upsertPresentationSupplierCost,
  type InventoryPresentationSupplierCostRow,
} from "@/lib/api_inventory";

type Props = {
  restaurantId: number;
  presentationId: number | null;
  supplierOptions: Array<{ label: string; value: number }>;
  loadingSuppliers: boolean;

  defaultSupplierId: number | null;
  onDefaultLastCost?: (lastCost: number | null) => void;
  onDefaultChanged: (supplierId: number, lastCost: number | null) => Promise<void>;
  standardCostFallback?: number | null;
};

export default function SuppliersTab({
  restaurantId,
  presentationId,
  supplierOptions,
  loadingSuppliers,
  defaultSupplierId,
  onDefaultLastCost,
  onDefaultChanged,
  standardCostFallback,
}: Props) {
  const [rows, setRows] = useState<InventoryPresentationSupplierCostRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newSupplierId, setNewSupplierId] = useState<number | null>(null);
  const [newLastCost, setNewLastCost] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftCosts, setDraftCosts] = useState<Record<number, number | null>>({});

  const draftCost = useMemo(
    () => (supplierId: number, fallback?: number | null) =>
      supplierId in draftCosts ? draftCosts[supplierId] : fallback ?? null,
    [draftCosts]
  );

  function setDraftCostForSupplier(supplierId: number, value: number | null) {
    setDraftCosts((prev) => ({ ...prev, [supplierId]: value }));
  }

  async function load() {
    if (!presentationId) return;
    setLoading(true);
    try {
      let r = await listPresentationSupplierCosts(restaurantId, presentationId);

      // ✅ Si hay default y NO existe en supplier_costs, lo insertamos
      if (defaultSupplierId) {
        const exists = (r || []).some((x) => x.supplierId === defaultSupplierId);
        if (!exists) {
          await upsertPresentationSupplierCost(restaurantId, presentationId, defaultSupplierId, {
            lastCost: null,
          });
          r = await listPresentationSupplierCosts(restaurantId, presentationId);
        }
      }

      setRows(r || []);
      const map: Record<number, number | null> = {};
      (r || []).forEach((x) => {
        map[x.supplierId] = x.lastCost ?? null;
      });
      setDraftCosts(map);

      // ✅ publica el lastCost del default para el tab “Compra/Costos”
      const found = (r || []).find((x) => x.supplierId === defaultSupplierId);
      onDefaultLastCost?.(found?.lastCost ?? null);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!presentationId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationId, defaultSupplierId]);

  // ✅ cuando cambia defaultSupplierId, recalcula el lastCost (sin re-fetch)
  useEffect(() => {
    const found = rows.find((x) => x.supplierId === defaultSupplierId);
    onDefaultLastCost?.(found?.lastCost ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSupplierId, rows]);

  async function addOrUpdate() {
    if (!presentationId) return;
    if (!newSupplierId) return message.error("Selecciona un proveedor");

    setSaving(true);
    try {
      await upsertPresentationSupplierCost(restaurantId, presentationId, newSupplierId, {
        lastCost: newLastCost ?? null,
      });
      message.success("Proveedor guardado");
      setNewSupplierId(null);
      setNewLastCost(null);
      await load();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando proveedor");
    } finally {
      setSaving(false);
    }
  }

  async function remove(supplierId: number) {
    if (!presentationId) return;
    try {
      await deletePresentationSupplierCost(restaurantId, presentationId, supplierId);
      message.success("Proveedor eliminado");
      await load();
    } catch (e: any) {
      message.error(e?.message ?? "Error eliminando proveedor");
    }
  }

  async function saveCostForSupplier(supplierId: number) {
    if (!presentationId) return;
    setSaving(true);
    try {
      const val = draftCost(supplierId, null);
      await upsertPresentationSupplierCost(restaurantId, presentationId, supplierId, {
        lastCost: val,
      });
      message.success("Costo actualizado");
      await load();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando costo");
    } finally {
      setSaving(false);
    }
  }

  function money(v: number) {
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
  const columns: ColumnsType<InventoryPresentationSupplierCostRow> = [
    {
      title: "Proveedor",
      render: (_, r) => (
        <Space>
          <span>{r.supplier?.name ?? `#${r.supplierId}`}</span>
          {defaultSupplierId === r.supplierId ? <Tag color="blue">Default</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Último costo",
      dataIndex: "lastCost",
      width: 260,
      render: (_, r) => {
        const currentDraft = draftCost(r.supplierId, r.lastCost ?? null);
        const display =
          currentDraft !== null && currentDraft !== undefined
            ? money(Number(currentDraft))
            : standardCostFallback !== null && standardCostFallback !== undefined
              ? `${money(Number(standardCostFallback))} (estándar)`
              : "—";

        return (
          <Space>
            <InputNumber
              style={{ width: 140 }}
              min={0}
              value={currentDraft ?? undefined}
              onChange={(v) => setDraftCostForSupplier(r.supplierId, v === null ? null : Number(v))}
            />
            <Button size="small" onClick={() => saveCostForSupplier(r.supplierId)} loading={saving}>
              Guardar
            </Button>
            <span style={{ opacity: 0.65 }}>{display}</span>
          </Space>
        );
      },
    },
    {
      title: "Última compra",
      dataIndex: "lastPurchaseAt",
      width: 190,
      render: (v) => (v ? String(v) : "—"),
    },
    {
      title: "Acciones",
      width: 260,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              if (!presentationId) return;

              // ✅ Asegura que exista supplier_cost para el nuevo default
              await upsertPresentationSupplierCost(restaurantId, presentationId, r.supplierId, {
                lastCost: draftCost(r.supplierId, r.lastCost ?? null),
              });

              await onDefaultChanged(r.supplierId, r.lastCost ?? null);

              // ✅ refresca tabla para que se vea el tag Default correctamente
              await load();
            }}
          >
            Hacer default
          </Button>

          <Popconfirm
            title="¿Quitar proveedor?"
            okText="Quitar"
            cancelText="Cancelar"
            onConfirm={() => remove(r.supplierId)}
            disabled={defaultSupplierId === r.supplierId}
          >
            <Button size="small" danger disabled={defaultSupplierId === r.supplierId}>
              Quitar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Costos por proveedor</div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        Edita el costo en la tabla. Cambiar el proveedor default solo elige cuál se usa como
        referencia, no modifica los costos. Si un proveedor no tiene último costo, se usa el costo
        estándar como referencia.
      </div>

      <Space style={{ width: "100%" }} size="middle" align="start">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Proveedor</div>
          <Select
            style={{ width: "100%" }}
            allowClear
            loading={loadingSuppliers}
            options={supplierOptions}
            placeholder="Selecciona proveedor"
            showSearch
            optionFilterProp="label"
            value={newSupplierId ?? undefined}
            onChange={(v) => setNewSupplierId(v ?? null)}
          />
        </div>

        <div style={{ width: 220 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Último costo</div>
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            value={newLastCost ?? undefined}
            onChange={(v) => setNewLastCost(v === null ? null : Number(v))}
          />
        </div>

        <div style={{ paddingTop: 22 }}>
          <Button type="primary" loading={saving} onClick={addOrUpdate}>
            Agregar / Guardar
          </Button>
        </div>
      </Space>

      <div style={{ marginTop: 14 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 6 }}
        />
      </div>

      <div style={{ marginTop: 6, opacity: 0.65, fontSize: 12 }}>
        El proveedor default se guarda en <code>inventory_presentation_details.supplier_id</code>.
        Aquí agregas proveedores alternos para comparar costo.
      </div>
    </>
  );
}

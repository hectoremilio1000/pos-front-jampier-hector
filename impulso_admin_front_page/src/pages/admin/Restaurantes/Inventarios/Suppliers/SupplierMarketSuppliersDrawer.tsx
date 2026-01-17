import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Form, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SupplierMarketRow, SupplierMarketSupplierRow, SupplierRow } from "@/lib/api_inventory";
import {
  addSupplierMarketSupplier,
  deleteSupplierMarketSupplier,
  listSupplierMarketSuppliers,
  listSuppliers,
} from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: number;
  market: SupplierMarketRow | null;
};

export default function SupplierMarketSuppliersDrawer({ open, onClose, restaurantId, market }: Props) {
  const [rows, setRows] = useState<SupplierMarketSupplierRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState<number | null>(null);
  const [form] = Form.useForm();

  async function load() {
    if (!market?.id) return;
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listSupplierMarketSuppliers(restaurantId, market.id),
        listSuppliers(restaurantId),
      ]);
      setRows(r);
      setSuppliers(s || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando proveedores del mercado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, market?.id]);

  const assignedIds = useMemo(() => new Set(rows.map((r) => r.supplierId)), [rows]);

  const options = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        disabled: assignedIds.has(s.id),
      })),
    [suppliers, assignedIds]
  );

  const columns: ColumnsType<SupplierMarketSupplierRow> = [
    {
      title: "Proveedor",
      render: (_, r) => r.supplier?.name ?? `Proveedor #${r.supplierId}`,
    },
    {
      title: "Acciones",
      width: 120,
      render: (_, r) => (
        <Button
          size="small"
          danger
          onClick={async () => {
            if (!market?.id) return;
            try {
              await deleteSupplierMarketSupplier(restaurantId, market.id, r.id);
              message.success("Proveedor quitado");
              load();
            } catch (e: any) {
              message.error(e?.message ?? "Error quitando proveedor");
            }
          }}
        >
          Quitar
        </Button>
      ),
    },
  ];

  async function submit() {
    if (!market?.id || !newSupplierId) return;
    setSaving(true);
    try {
      await addSupplierMarketSupplier(restaurantId, market.id, newSupplierId);
      message.success("Proveedor agregado");
      setNewSupplierId(null);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error agregando proveedor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={market ? `Proveedores – ${market.name}` : "Proveedores"}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      {!market ? (
        <div style={{ opacity: 0.7 }}>Selecciona un mercado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} />

          <Form layout="inline" form={form}>
            <Form.Item label="Agregar proveedor" name="supplierId" rules={[{ required: true }]}>
              <Select
                showSearch
                style={{ width: 320 }}
                placeholder="Selecciona proveedor"
                options={options}
                value={newSupplierId ?? undefined}
                onChange={(v) => setNewSupplierId(v ?? null)}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" loading={saving} onClick={submit}>
                  Agregar
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setNewSupplierId(null);
                  }}
                >
                  Limpiar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}
    </Drawer>
  );
}

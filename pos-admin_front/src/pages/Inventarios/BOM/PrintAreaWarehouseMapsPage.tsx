import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputNumber, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import { PrintAreaWarehouseMapRow, WarehouseRow, listPrintAreaWarehouseMaps, listWarehouses, upsertPrintAreaWarehouseMap } from "@/lib/api_inventory";

export default function PrintAreaWarehouseMapsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<PrintAreaWarehouseMapRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const [w, r] = await Promise.all([listWarehouses(restaurantId), listPrintAreaWarehouseMaps(restaurantId)]);
      setWarehouses(w);
      setRows(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando mapeos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const whOptions = useMemo(() => warehouses.map((w) => ({ label: w.name, value: w.id })), [warehouses]);

  const cols: ColumnsType<PrintAreaWarehouseMapRow> = [
    { title: "PrintAreaId", dataIndex: "printAreaId", width: 120 },
    { title: "WarehouseId", dataIndex: "warehouseId", width: 120 },
    { title: "Activo", dataIndex: "isActive", width: 90, render: (v) => (v === false ? "No" : "Sí") },
  ];

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await upsertPrintAreaWarehouseMap(restaurantId, {
        printAreaId: v.printAreaId,
        warehouseId: v.warehouseId,
        isActive: true,
      });
      message.success("Mapeo guardado");
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando mapeo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <Space>
        <Button onClick={load} loading={loading}>Refrescar</Button>
      </Space>

      <Table rowKey="id" loading={loading} columns={cols} dataSource={rows} pagination={{ pageSize: 20 }} />

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
        <Form layout="inline" form={form}>
          <Form.Item label="PrintAreaId" name="printAreaId" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true }]}>
            <Select placeholder="Selecciona" options={whOptions} style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={saving} onClick={submit}>
              Agregar
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div style={{ opacity: 0.65 }}>
        * Scaffold. Si tu backend expone catálogo de print areas, lo conectamos y evitamos capturar el ID a mano.
      </div>
    </div>
  );
}

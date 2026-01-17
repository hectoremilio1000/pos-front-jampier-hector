import { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, DatePicker, Select, message } from "antd";
import dayjs from "dayjs";
import { createStockCount, listWarehouses, WarehouseRow } from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  restaurantId: number;
};

export default function StockCountFormModal({ open, onClose, onCreated, restaurantId }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);

  useEffect(() => {
    if (!open) return;
    listWarehouses(restaurantId)
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
    form.setFieldsValue({ countAt: dayjs(), name: "", countedBy: "" });
  }, [open, restaurantId, form]);

  const whOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses]
  );

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await createStockCount(restaurantId, {
        warehouseId: v.warehouseId,
        startedAt: v.countAt.toISOString(), // reusa tu datepicker
        notes: v.name || "", // reusa tu input como notas
        createdBy: "admin",
        countedBy: v.countedBy || null,
      });

      message.success("Conteo creado");
      onCreated();
    } catch (e: any) {
      message.error(e?.message ?? "Error creando conteo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nuevo conteo físico"
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Crear"
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Nombre del conteo" name="name" rules={[{ required: true }]}>
          <Input placeholder="Conteo cierre semana" />
        </Form.Item>

        <Form.Item label="Responsable" name="countedBy" rules={[{ required: true }]}>
          <Input placeholder="Ej. Juan Pérez" />
        </Form.Item>

        <Form.Item label="Almacén" name="warehouseId" rules={[{ required: true }]}>
          <Select placeholder="Selecciona un almacén" options={whOptions} />
        </Form.Item>

        <Form.Item label="Fecha/hora del conteo" name="countAt" rules={[{ required: true }]}>
          <DatePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

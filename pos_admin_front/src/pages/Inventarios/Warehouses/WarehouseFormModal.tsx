import { Modal, Form, Input, Switch, message } from "antd";
import { useEffect, useState } from "react";
import type { WarehouseRow } from "@/lib/api_inventory";
import { upsertWarehouse } from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  warehouse: WarehouseRow | null;
};

export default function WarehouseFormModal({ open, onClose, onSaved, restaurantId, warehouse }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: warehouse?.name ?? "",
      description: warehouse?.description ?? "",
      isActive: warehouse?.isActive !== false,
    });
  }, [open, warehouse, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await upsertWarehouse(restaurantId, {
        id: warehouse?.id,
        name: v.name,
        description: v.description ?? "",
        isActive: v.isActive,
      });
      message.success("Almacén guardado");
      onSaved();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando almacén");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={warehouse?.id ? "Editar almacén" : "Nuevo almacén"}
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Guardar"
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Nombre" name="name" rules={[{ required: true }]}>
          <Input placeholder="Bodega" />
        </Form.Item>
        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Activo" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

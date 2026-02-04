import { useEffect, useState } from "react";
import { Form, Input, Modal, Switch, message } from "antd";
import type { SupplierMarketRow } from "@/lib/api_inventory";
import { upsertSupplierMarket } from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  market: SupplierMarketRow | null;
};

export default function SupplierMarketFormModal({ open, onClose, onSaved, restaurantId, market }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: market?.name ?? "",
      description: market?.description ?? "",
      isActive: market?.isActive !== false,
    });
  }, [open, market, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await upsertSupplierMarket(restaurantId, {
        id: market?.id,
        name: String(v.name ?? "").trim(),
        description: v.description ? String(v.description).trim() : undefined,
        isActive: v.isActive !== false,
      });
      message.success("Mercado guardado");
      onSaved();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando mercado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={market ? "Editar mercado" : "Nuevo mercado"}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Guardar"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Nombre" name="name" rules={[{ required: true, message: "Nombre requerido" }]}>
          <Input placeholder="Central de Abastos" />
        </Form.Item>
        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} placeholder="Opcional" />
        </Form.Item>
        <Form.Item label="Activo" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

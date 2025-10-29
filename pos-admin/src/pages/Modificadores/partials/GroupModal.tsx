// pos-admin/src/pages/Modificadores/partials/GroupModal.tsx
import { useEffect } from "react";
import { Modal, Form, Input, message } from "antd";
import apiOrder from "@/components/apis/apiOrder";
import type { ModifierGroup } from "../index";

export default function GroupModal({
  open,
  editing,
  onCancel,
  onSaved,
}: {
  open: boolean;
  editing: ModifierGroup | null;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form] = Form.useForm<{ name: string; code: string }>();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({ name: editing.name, code: editing.code });
    } else {
      form.resetFields();
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      if (editing) {
        await apiOrder.put(`/modifier-groups/${editing.id}`, { name: v.name });
        message.success("Grupo actualizado");
      } else {
        await apiOrder.post(`/modifier-groups`, v);
        message.success("Grupo creado");
      }
      await onSaved();
    } catch {
      /* no-op */
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? "Editar grupo" : "Nuevo grupo"}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editing ? "Guardar" : "Crear"}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: "Indica un nombre" }]}
        >
          <Input placeholder="Ej. Toppings" />
        </Form.Item>
        <Form.Item
          label="Código"
          name="code"
          rules={[{ required: !editing, message: "Indica un código" }]}
        >
          <Input placeholder="Ej. TOP" disabled={!!editing} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

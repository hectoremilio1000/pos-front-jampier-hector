// pos-admin/src/pages/Modificadores/partials/GroupModal.tsx
import { useEffect } from "react";
import { Modal, Form, Input, message, Steps } from "antd";
import apiOrder from "@/components/apis/apiOrder";

type SavedGroup = { id: number; name: string; code: string };

export default function GroupModal({
  open,
  editing,
  wizard,
  onCancel,
  onSaved,
}: {
  open: boolean;
  editing: SavedGroup | null;
  wizard?: { steps: { title: string }[]; current: number };
  onCancel: () => void;
  onSaved: (group?: SavedGroup) => Promise<void> | void;
}) {
  const [form] = Form.useForm<{ name: string; code?: string }>();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({ name: editing.name, code: editing.code });
    } else {
      form.resetFields(["name", "code"]);
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      if (editing) {
        await apiOrder.put(`/modifier-groups/${editing.id}`, { name: v.name });
        message.success("Grupo actualizado");
        await onSaved({ id: editing.id, name: v.name, code: editing.code });
        return;
      }
      const res = await apiOrder.post(`/modifier-groups`, { name: v.name });
      const created = (res.data?.data ?? res.data) as SavedGroup | undefined;
      if (created?.id) {
        message.success("Grupo creado");
        await onSaved(created);
        return;
      }
      message.success("Grupo creado");
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
      {wizard && (
        <Steps
          size="small"
          current={wizard.current}
          items={wizard.steps}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: "Indica un nombre" }]}
        >
          <Input placeholder="Ej. Toppings" />
        </Form.Item>
        {editing && (
          <Form.Item label="Código" name="code">
            <Input disabled />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

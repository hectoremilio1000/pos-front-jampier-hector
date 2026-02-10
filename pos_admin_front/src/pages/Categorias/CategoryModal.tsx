import { useEffect } from "react";
import { Modal, Form, Input, Switch } from "antd";

export type CategoryValues = {
  name: string;
  isEnabled: boolean;
};

export default function CategoryModal({
  open,
  mode, // "create" | "edit"
  initial,
  confirmLoading,
  onCancel,
  onOk,
  onDuplicateCheck, // (opcional) valida duplicados en front
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<CategoryValues>;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: CategoryValues) => Promise<void> | void;
  onDuplicateCheck?: (v: CategoryValues) => string | null; // retorna error si hay duplicado
}) {
  const [form] = Form.useForm<CategoryValues>();

  useEffect(() => {
    form.setFieldsValue({
      name: initial?.name ?? "",
      isEnabled: initial?.isEnabled ?? true,
    });
  }, [open, initial, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (onDuplicateCheck) {
        const msg = onDuplicateCheck(values);
        if (msg) {
          form.setFields([{ name: "name", errors: [msg] }]);
          return;
        }
      }
      await onOk(values);
      form.resetFields();
    } catch {
      /* validation errors are shown by antd */
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nueva categoría" : "Editar categoría"}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText={mode === "create" ? "Crear" : "Actualizar"}
      confirmLoading={!!confirmLoading}
      destroyOnClose
    >
      <Form<CategoryValues> form={form} layout="vertical">
        <Form.Item
          label="Nombre"
          name="name"
          rules={[
            { required: true, message: "Nombre requerido" },
            { min: 2, message: "Mínimo 2 caracteres" },
          ]}
        >
          <Input placeholder="Bebidas" maxLength={60} autoFocus />
        </Form.Item>

        <Form.Item label="¿Activo?" name="isEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

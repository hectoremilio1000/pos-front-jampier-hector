import { useEffect } from "react";
import { Modal, Form, Input, InputNumber } from "antd";

export type ServiceValues = {
  name: string;
  sortOrder?: number;
};

export default function ServiceModal({
  open,
  mode,
  initial,
  confirmLoading,
  onCancel,
  onOk,
  onDuplicateCheck,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<ServiceValues>;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: ServiceValues) => Promise<void> | void;
  onDuplicateCheck?: (v: ServiceValues) => string | null;
}) {
  const [form] = Form.useForm<ServiceValues>();

  useEffect(() => {
    form.setFieldsValue({
      name: initial?.name ?? "",
      sortOrder: initial?.sortOrder ?? 1,
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
      /* antd muestra validaciones */
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nueva área" : "Editar área"}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText={mode === "create" ? "Crear" : "Actualizar"}
      confirmLoading={!!confirmLoading}
      destroyOnClose
    >
      <Form<ServiceValues> form={form} layout="vertical">
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: "Nombre requerido" }]}
        >
          <Input
            placeholder="Comida Rapida, Delivery, En local"
            maxLength={60}
            autoFocus
          />
        </Form.Item>

        <Form.Item label="Orden" name="sortOrder">
          <InputNumber min={1} className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

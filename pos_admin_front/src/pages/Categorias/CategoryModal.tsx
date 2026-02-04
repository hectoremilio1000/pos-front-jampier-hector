// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Categorias/CategoryModal.tsx
import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Switch } from "antd";

export type CategoryValues = {
  name: string;
  code: string;
  sortOrder: number;
  isEnabled: boolean;
};

export default function CategoryModal({
  open,
  mode, // "create" | "edit"
  initial,
  categoriesCount, // para autogenerar en create
  confirmLoading,
  onCancel,
  onOk,
  onDuplicateCheck, // (opcional) valida duplicados en front
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<CategoryValues>;
  categoriesCount: number;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: CategoryValues) => Promise<void> | void;
  onDuplicateCheck?: (v: CategoryValues) => string | null; // retorna error si hay duplicado
}) {
  const [form] = Form.useForm<CategoryValues>();

  useEffect(() => {
    // autogenerar code/sortOrder en create
    const next = String(categoriesCount + 1);
    form.setFieldsValue({
      name: initial?.name ?? "",
      code: mode === "create" ? next : (initial?.code ?? ""),
      sortOrder: mode === "create" ? Number(next) : (initial?.sortOrder ?? 1),
      isEnabled: initial?.isEnabled ?? true,
    });
  }, [open, mode, categoriesCount, initial, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // (opcional) duplicados
      if (onDuplicateCheck) {
        const msg = onDuplicateCheck(values);
        if (msg) {
          form.setFields([
            { name: "name", errors: [msg] },
            { name: "code", errors: [msg] },
          ]);
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

        <Form.Item
          label="Código"
          name="code"
          rules={[{ required: true, message: "Código requerido" }]}
        >
          <Input placeholder="1" maxLength={12} />
        </Form.Item>

        <Form.Item
          label="Orden"
          name="sortOrder"
          rules={[{ required: true, message: "Orden requerido" }]}
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <Form.Item label="¿Activo?" name="isEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

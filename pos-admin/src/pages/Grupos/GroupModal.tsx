import { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Typography,
} from "antd";
const { Text } = Typography;

export type GroupValues = {
  name: string;
  code: string;
  categoryId: number;
  sortOrder: number;
  isEnabled: boolean;
};

type Category = { id: number; name: string };

export default function GroupModal({
  open,
  mode, // "create" | "edit"
  initial,
  categories,
  groupsCount, // para autogenerar orden/código en create
  confirmLoading,
  onCancel,
  onOk,
  onDuplicateCheck, // opcional: valida duplicados (name/code)
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<GroupValues>;
  categories: Category[];
  groupsCount: number;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: GroupValues) => Promise<void> | void;
  onDuplicateCheck?: (v: GroupValues) => string | null;
}) {
  const [form] = Form.useForm<GroupValues>();

  // genera código legible según nombre o consecutivo
  const codeFrom = (name: string, count: number) => {
    const base = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    return base ? `${base}-${count + 1}` : String(count + 1);
  };

  useEffect(() => {
    const next = String(groupsCount + 1);
    form.setFieldsValue({
      name: initial?.name ?? "",
      code:
        mode === "create"
          ? initial?.name
            ? codeFrom(initial.name, groupsCount)
            : next
          : (initial?.code ?? ""),
      categoryId: initial?.categoryId ?? categories[0]?.id ?? undefined,
      sortOrder: mode === "create" ? Number(next) : (initial?.sortOrder ?? 1),
      isEnabled: initial?.isEnabled ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, groupsCount, categories.length]);

  const handleValuesChange = (_: any, all: GroupValues) => {
    // si el usuario tipea nombre y estamos en create, autogenera code si el campo code está vacío
    if (mode === "create") {
      const cur = form.getFieldValue("code");
      if (!cur && all.name) {
        form.setFieldsValue({ code: codeFrom(all.name, groupsCount) });
      }
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (onDuplicateCheck) {
      const err = onDuplicateCheck(values);
      if (err) {
        form.setFields([
          { name: "name", errors: [err] },
          { name: "code", errors: [err] },
        ]);
        return;
      }
    }
    await onOk(values);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nuevo grupo" : "Editar grupo"}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText={mode === "create" ? "Crear" : "Actualizar"}
      confirmLoading={!!confirmLoading}
      destroyOnClose
    >
      <Form<GroupValues>
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: "Nombre requerido" }, { min: 2 }]}
        >
          <Input placeholder="Cervezas" maxLength={60} autoFocus />
        </Form.Item>

        <Form.Item
          label="Código"
          name="code"
          rules={[{ required: true, message: "Código requerido" }]}
          extra={
            <Text type="secondary">
              Se sugiere automáticamente al escribir el nombre
            </Text>
          }
        >
          <Input placeholder="CERV-1" maxLength={12} />
        </Form.Item>

        <Form.Item
          label="Categoría"
          name="categoryId"
          rules={[{ required: true, message: "Selecciona una categoría" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Selecciona categoría"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>

        <Form.Item label="Orden" name="sortOrder" rules={[{ required: true }]}>
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <Form.Item label="¿Activo?" name="isEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Switch, Select } from "antd";

export type SubgroupValues = {
  groupId: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

type Grupo = { id: number; name: string };

export default function SubgroupModal({
  open,
  mode, // "create" | "edit"
  initial,
  grupos, // catálogo de grupos
  subgroupsCount, // para autogenerar en create
  confirmLoading,
  onCancel,
  onOk,
  onDuplicateCheck, // opcional: valida duplicados en front
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<SubgroupValues>;
  grupos: Grupo[];
  subgroupsCount: number;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: SubgroupValues) => Promise<void> | void;
  onDuplicateCheck?: (v: SubgroupValues) => string | null;
}) {
  const [form] = Form.useForm<SubgroupValues>();

  useEffect(() => {
    // Autogenerar code/sortOrder en create; respetar initial en edit
    const next = String(subgroupsCount + 1);
    form.setFieldsValue({
      groupId: initial?.groupId ?? grupos[0]?.id ?? 0,
      name: initial?.name ?? "",
      code: mode === "create" ? next : (initial?.code ?? ""),
      sortOrder: mode === "create" ? Number(next) : (initial?.sortOrder ?? 1),
      isEnabled: initial?.isEnabled ?? true,
    });
  }, [open, mode, subgroupsCount, initial, grupos, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
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
      /* antd muestra validaciones */
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nuevo subgrupo" : "Editar subgrupo"}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText={mode === "create" ? "Crear" : "Actualizar"}
      confirmLoading={!!confirmLoading}
      destroyOnClose
    >
      <Form<SubgroupValues> form={form} layout="vertical">
        <Form.Item
          label="Grupo"
          name="groupId"
          rules={[{ required: true, message: "Selecciona un grupo" }]}
        >
          <Select
            placeholder="Grupo"
            options={grupos.map((g) => ({ value: g.id, label: g.name }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          label="Nombre"
          name="name"
          rules={[
            { required: true, message: "Nombre requerido" },
            { min: 2, message: "Mínimo 2 caracteres" },
          ]}
        >
          <Input placeholder="Nombre del subgrupo" maxLength={60} />
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

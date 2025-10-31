// /src/components/PlanFormModal.tsx
import { useEffect, useState } from "react";
import { Form, Input, Modal, Switch } from "antd";

export type PlanFormValues = {
  code: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isActive: boolean;
  defaultPriceId?: number;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<PlanFormValues>;
  title: string;
  okText?: string;
  disableCode?: boolean;
  onCancel: () => void;
  onSubmit: (values: PlanFormValues) => Promise<void> | void;
};

export default function PlanFormModal({
  open,
  loading,
  initialValues,
  title,
  okText = "Guardar",
  disableCode = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<PlanFormValues>();
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setCodeTouched(false);
      form.resetFields();
      form.setFieldsValue({
        isPublic: true,
        isActive: true,
        ...initialValues,
      });
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const v = await form.validateFields();
    await onSubmit(v);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      confirmLoading={!!loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
          <Input placeholder="Plan Pro" />
        </Form.Item>
        <Form.Item name="code" label="Code" rules={[{ required: true }]}>
          <Input
            placeholder="PRO"
            disabled={disableCode}
            onFocus={() => setCodeTouched(true)}
            onChange={() => setCodeTouched(true)}
          />
        </Form.Item>
        <Form.Item name="description" label="Descripción">
          <Input.TextArea rows={3} placeholder="Incluye PDV, Facturas, IA..." />
        </Form.Item>
        <Form.Item label="Público" name="isPublic" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Activo" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

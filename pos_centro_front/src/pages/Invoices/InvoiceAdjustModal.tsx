import { Form, Input, InputNumber, Modal } from "antd";

export type AdjustFormValues = {
  discount?: number; // 👈 PESOS
  adjustment?: number; // 👈 PESOS (cargo + / abono -)
  notes?: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: AdjustFormValues;
  onCancel: () => void;
  onSubmit: (values: AdjustFormValues) => Promise<void> | void;
};

export default function InvoiceAdjustModal({
  open,
  loading,
  initialValues,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<AdjustFormValues>();

  return (
    <Modal
      title="Ajuste / Descuento"
      open={open}
      confirmLoading={!!loading}
      onCancel={onCancel}
      okText="Guardar"
      onOk={async () => {
        const v = await form.validateFields();
        await onSubmit(v);
      }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="discount" label="Descuento total (MXN)">
          <InputNumber<number>
            min={0}
            step={1}
            style={{ width: "100%" }}
            formatter={(v) =>
              v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(v) => {
              const n = Number((v ?? "").replace(/[^\d.]/g, ""));
              return Number.isNaN(n) ? 0 : n;
            }}
          />
        </Form.Item>

        <Form.Item
          name="adjustment"
          label="Ajuste total (MXN) (cargo + / abono -)"
        >
          <InputNumber<number>
            step={1}
            style={{ width: "100%" }}
            formatter={(v) =>
              v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(v) => {
              const n = Number((v ?? "").replace(/[^\d.-]/g, ""));
              return Number.isNaN(n) ? 0 : n;
            }}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

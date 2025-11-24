// /src/components/PlanPriceFormModal.tsx
import { useEffect, useState } from "react";
import { Form, InputNumber, Modal, Select, Switch, Space } from "antd";

export type PlanInterval = "day" | "week" | "month" | "year";

export type PlanPriceFormValues = {
  planId: number;
  interval: PlanInterval;
  intervalCount: number;
  amount: number;
  currency: string;
  isDefault: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<PlanPriceFormValues>;
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: PlanPriceFormValues) => Promise<void> | void;
};

type Preset =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly"
  | "custom";

const PRESETS: {
  value: Preset;
  label: string;
  interval: PlanInterval;
  count: number;
}[] = [
  { value: "daily", label: "Diario", interval: "day", count: 1 },
  { value: "weekly", label: "Semanal", interval: "week", count: 1 },
  { value: "monthly", label: "Mensual", interval: "month", count: 1 },
  { value: "quarterly", label: "Cada 3 meses", interval: "month", count: 3 },
  { value: "semiannual", label: "Cada 6 meses", interval: "month", count: 6 },
  { value: "yearly", label: "Anual", interval: "year", count: 1 },
  { value: "custom", label: "Personalizado", interval: "month", count: 1 },
];

export default function PlanPriceFormModal({
  open,
  loading,
  initialValues,
  title,
  okText = "Guardar",
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<PlanPriceFormValues>();
  const [preset, setPreset] = useState<Preset>("monthly");

  // al abrir, setear valores
  useEffect(() => {
    if (open) {
      form.resetFields();
      const iv = initialValues || {};
      // inferir preset si viene interval/intervalCount
      const match = PRESETS.find(
        (p) =>
          p.interval === (iv.interval || "month") &&
          p.count === (iv.intervalCount || 1)
      );
      setPreset(match ? match.value : "custom");

      form.setFieldsValue({
        planId: iv.planId!,
        interval: (iv.interval as PlanInterval) || "month",
        intervalCount: iv.intervalCount ?? 1,
        amount: iv.amount as number,
        currency: (iv.currency || "MXN").toUpperCase(),
        isDefault: !!iv.isDefault,
      });
    }
  }, [open, initialValues, form]);

  const isCustom = preset === "custom";

  const handlePresetChange = (value: Preset) => {
    setPreset(value);
    const p = PRESETS.find((x) => x.value === value)!;
    form.setFieldsValue({
      interval: p.interval,
      intervalCount: p.count,
    });
  };

  const handleOk = async () => {
    const v = await form.validateFields();
    await onSubmit({
      planId: Number(v.planId),
      interval: v.interval,
      intervalCount: Math.max(1, Number(v.intervalCount)),
      amount: Number(v.amount),
      currency: (v.currency || "MXN").toUpperCase(),
      isDefault: !!v.isDefault,
    });
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
        <Form.Item name="planId" hidden rules={[{ required: true }]}>
          <InputNumber />
        </Form.Item>

        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          Periodo de renovación
        </div>
        <Form.Item>
          <Select
            value={preset}
            onChange={handlePresetChange}
            options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </Form.Item>

        {isCustom && (
          <Space.Compact style={{ width: "100%", gap: 8 }}>
            <Form.Item
              name="interval"
              style={{ width: "50%" }}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "day", label: "Días" },
                  { value: "week", label: "Semanas" },
                  { value: "month", label: "Meses" },
                  { value: "year", label: "Años" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="intervalCount"
              style={{ width: "50%" }}
              rules={[{ required: true, type: "number", min: 1 }]}
            >
              <InputNumber style={{ width: "100%" }} min={1} />
            </Form.Item>
          </Space.Compact>
        )}

        {!isCustom && (
          <>
            <Form.Item name="interval" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="intervalCount" hidden>
              <InputNumber />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="amount"
          label="Precio (MXN)"
          rules={[{ required: true, type: "number", min: 0 }]}
        >
          <InputNumber style={{ width: "100%" }} step={50} />
        </Form.Item>

        <Form.Item name="currency" label="Moneda" rules={[{ required: true }]}>
          <Select options={[{ value: "MXN", label: "MXN" }]} />
        </Form.Item>

        <Form.Item name="isDefault" label="Default" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

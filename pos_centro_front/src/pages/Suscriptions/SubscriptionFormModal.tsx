import { useEffect } from "react";
import { Form, InputNumber, Modal, Select } from "antd";

export type PlanInterval = "month" | "semiannual" | "year";

export type RestaurantOpt = { value: number; label: string };
export type PlanOpt = {
  value: string;
  label: string;
  interval: PlanInterval;
  amount: number; // PESOS
};

export type SubscriptionFormValues = {
  restaurantId: number;
  planCode: string;
  priceOverridePesos?: number; // MXN
  recurringDiscountPercent?: number; // %
  recurringDiscount?: number; // MXN
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<SubscriptionFormValues>;
  restaurants: RestaurantOpt[];
  plans: PlanOpt[];
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: SubscriptionFormValues) => Promise<void> | void;
};

export default function SubscriptionFormModal({
  open,
  loading,
  initialValues,
  restaurants,
  plans,
  title,
  okText = "Guardar",
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<SubscriptionFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        // normaliza a number por si vienen strings del backend
        restaurantId: initialValues?.restaurantId,
        planCode: initialValues?.planCode,
        priceOverridePesos:
          initialValues?.priceOverridePesos == null
            ? undefined
            : Number(initialValues.priceOverridePesos),
        recurringDiscountPercent: Number(
          initialValues?.recurringDiscountPercent ?? 0
        ),
        recurringDiscount: Number(initialValues?.recurringDiscount ?? 0),
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
        <Form.Item
          name="restaurantId"
          label="Restaurante"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={restaurants}
            placeholder="Selecciona restaurante"
          />
        </Form.Item>

        <Form.Item name="planCode" label="Plan" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={plans.map((p) => ({ value: p.value, label: p.label }))}
            placeholder="Selecciona plan"
          />
        </Form.Item>

        <Form.Item name="priceOverridePesos" label="Precio manual (MXN)">
          <InputNumber<number>
            style={{ width: "100%" }}
            min={0}
            step={10}
            formatter={(v) =>
              v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(v) => {
              const n = Number((v ?? "").replace(/[^\d.]/g, ""));
              return Number.isNaN(n) ? 0 : n;
            }}
          />
        </Form.Item>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item name="recurringDiscountPercent" label="Descuento %">
            <InputNumber<number> min={0} max={100} />
          </Form.Item>

          <Form.Item name="recurringDiscount" label="Descuento fijo (MXN)">
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={1}
              formatter={(v) =>
                v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(v) => {
                const n = Number((v ?? "").replace(/[^\d.]/g, ""));
                return Number.isNaN(n) ? 0 : n;
              }}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

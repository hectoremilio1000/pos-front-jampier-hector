import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Space,
  message,
} from "antd";
import dayjs from "dayjs";
import apiAuth from "@/apis/apiAuth";
import apiCenter from "@/apis/apiCenter";

type PlanPrice = {
  id: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number;
  currency: string;
  isDefault: boolean;
};
type Plan = { id: number; name: string; prices: PlanPrice[] };
type Restaurant = { id: number; name: string; email?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export default function ManualSubscriptionModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);

  const planId = Form.useWatch("planId", form) as number | undefined;
  const plan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId]
  );

  const priceId = Form.useWatch("planPriceId", form) as number | undefined;
  const selectedPrice = useMemo(
    () => plan?.prices.find((pr) => pr.id === priceId),
    [plan, priceId]
  );

  useEffect(() => {
    if (!open) return;
    // carga planes (con precios) y restaurants
    apiCenter
      .get("/plans")
      .then(({ data }) => setPlans(data))
      .catch(() => message.error("No se pudieron cargar planes"));
    // lista simple de restaurantes (ajusta a tu endpoint real)
    apiAuth
      .get("/restaurants?perPage=100")
      .then(({ data }) => setRestaurants(data.data ?? data))
      .catch(() => {});
    form.setFieldsValue({
      startDateIso: dayjs(),
      subscriptionStatus: "active",
      createPayment: true,
      provider: "cash",
      paymentStatus: "succeeded",
    });
  }, [open]);

  useEffect(() => {
    if (!selectedPrice) return;
    // autollenar amountOverride con el del planPrice
    form.setFieldsValue({ amountOverride: Number(selectedPrice.amount) });
  }, [selectedPrice]);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);
      await apiCenter.post("/subscriptions/manual", {
        restaurantId: Number(v.restaurantId),
        planPriceId: Number(v.planPriceId),
        subscriptionStatus: v.subscriptionStatus,
        startDateIso: v.startDateIso?.toISOString(),
        createPayment: !!v.createPayment,
        provider: v.provider,
        paymentStatus: v.paymentStatus,
        providerPaymentId: v.providerPaymentId || null,
        providerSessionId: v.providerSessionId || null,
        amountOverride:
          v.amountOverride != null ? Number(v.amountOverride) : null,
      });
      message.success("Suscripción creada");
      await onCreated();
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear la suscripción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Nueva suscripción (manual)"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Crear"
      confirmLoading={loading}
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
            options={restaurants.map((r) => ({
              value: r.id,
              label: `${r.id} — ${r.name}`,
            }))}
            placeholder="Selecciona restaurante"
          />
        </Form.Item>

        <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
          <Select
            options={plans.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Selecciona plan"
          />
        </Form.Item>

        <Form.Item
          name="planPriceId"
          label="Precio del plan"
          rules={[{ required: true }]}
        >
          <Select
            disabled={!plan}
            options={(plan?.prices ?? []).map((pr) => ({
              value: pr.id,
              label: `${pr.interval}/${pr.intervalCount} — $${Number(pr.amount).toFixed(2)} ${pr.currency}${pr.isDefault ? " (default)" : ""}`,
            }))}
            placeholder="Selecciona intervalo y precio"
          />
        </Form.Item>

        <Form.Item name="startDateIso" label="Inicio (opcional)">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="subscriptionStatus"
          label="Estado de suscripción"
          initialValue="active"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "active", label: "active" },
              { value: "trialing", label: "trialing" },
              { value: "paused", label: "paused" },
              { value: "canceled", label: "canceled" },
              { value: "expired", label: "expired" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="createPayment"
          label="Registrar pago"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Space.Compact style={{ width: "100%", gap: 8 }}>
          <Form.Item name="provider" label="Proveedor" style={{ width: "50%" }}>
            <Select
              options={[
                { value: "cash", label: "Efectivo" },
                { value: "stripe", label: "Stripe" },
                { value: "mp", label: "Mercado Pago" },
                { value: "transfer", label: "Transferencia" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="paymentStatus"
            label="Estado de pago"
            style={{ width: "50%" }}
          >
            <Select
              options={[
                { value: "succeeded", label: "succeeded" },
                { value: "pending", label: "pending" },
                { value: "failed", label: "failed" },
                { value: "refunded", label: "refunded" },
              ]}
            />
          </Form.Item>
        </Space.Compact>

        <Space.Compact style={{ width: "100%", gap: 8 }}>
          <Form.Item
            name="amountOverride"
            label="Importe"
            tooltip="Si lo dejas en blanco, se usa el monto del PlanPrice"
            style={{ width: "50%" }}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={10} />
          </Form.Item>
          <Form.Item
            name="providerPaymentId"
            label="Ref. pago (opcional)"
            style={{ width: "50%" }}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Space.Compact>

        {/* Si quieres session/link externo */}
        {/* <Form.Item name="providerSessionId" label="Ref. sesión (opcional)">
          <Input />
        </Form.Item> */}
      </Form>
    </Modal>
  );
}

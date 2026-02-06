import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Space,
  message,
  Input,
  Radio,
  Typography,
  Button,
} from "antd";
import dayjs from "dayjs";
import apiAuth from "./apis/apiAuth";
import apiCenter from "./apis/apiCenter";

const { Text } = Typography;

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

type FormValues = {
  restaurantId: number;
  planId: number;
  planPriceId: number;

  startDateIso?: any; // dayjs
  subscriptionStatus: "active" | "trialing" | "paused" | "canceled" | "expired";

  // TOTAL del periodo (override del plan price)
  amountOverride: number;

  // Pago
  paymentType: "total" | "partial";
  paymentAmount?: number; // solo si partial

  provider: "cash" | "transfer" | "stripe";
  paymentStatus: "succeeded" | "pending" | "failed";

  providerPaymentId?: string; // solo para no-stripe
};

export default function ManualSubscriptionModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const planId = Form.useWatch("planId", form) as number | undefined;
  const plan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  );

  const priceId = Form.useWatch("planPriceId", form) as number | undefined;
  const selectedPrice = useMemo(
    () => plan?.prices.find((pr) => pr.id === priceId),
    [plan, priceId],
  );

  const provider = Form.useWatch("provider", form) as
    | FormValues["provider"]
    | undefined;
  const paymentType = Form.useWatch("paymentType", form) as
    | FormValues["paymentType"]
    | undefined;

  const amountOverride = Form.useWatch("amountOverride", form) as
    | number
    | undefined;
  const paymentAmount = Form.useWatch("paymentAmount", form) as
    | number
    | undefined;

  const formatInterval = (interval: PlanPrice["interval"], count: number) => {
    const map: Record<string, { s: string; p: string }> = {
      day: { s: "día", p: "días" },
      week: { s: "semana", p: "semanas" },
      month: { s: "mes", p: "meses" },
      year: { s: "año", p: "años" },
    };
    const unit = map[interval] ?? { s: interval, p: `${interval}s` };
    return count === 1 ? unit.s : `${count} ${unit.p}`;
  };

  const money = (n?: number | null, cur?: string | null) =>
    `$${Number(n ?? 0).toFixed(2)} ${cur ?? "MXN"}`;

  const getTotal = () => {
    const n = Number(amountOverride ?? selectedPrice?.amount ?? 0);
    return Math.max(0, Number(n.toFixed(2)));
  };

  const getPayNow = () => {
    const total = getTotal();
    if (paymentType === "total") return total;
    const n = Number(paymentAmount ?? 0);
    return Math.max(0, Number(n.toFixed(2)));
  };

  useEffect(() => {
    if (!open) return;

    setCheckoutUrl(null);

    // carga planes (con precios) y restaurants
    apiCenter
      .get("/plans")
      .then(({ data }) => setPlans(data))
      .catch(() => message.error("No se pudieron cargar planes"));

    apiAuth
      .get("/restaurants?perPage=100")
      .then(({ data }) => setRestaurants(data.data ?? data))
      .catch(() => {});

    form.resetFields();
    form.setFieldsValue({
      startDateIso: dayjs(),
      subscriptionStatus: "active",

      // defaults
      provider: "cash",
      paymentStatus: "succeeded", // para efectivo/transfer, normalmente lo marcas pagado
      paymentType: "total",
      amountOverride: 0,
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando seleccionas un price, autollenar TOTAL con el amount del planPrice
  useEffect(() => {
    if (!selectedPrice) return;
    form.setFieldsValue({
      amountOverride: Number(selectedPrice.amount),
      paymentType: "total",
      paymentAmount: undefined,
    });
  }, [selectedPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si cambias a pago TOTAL: limpiamos paymentAmount (se calculará como total)
  useEffect(() => {
    if (!open) return;
    if (paymentType === "total") {
      form.setFieldsValue({ paymentAmount: undefined });
    }
  }, [paymentType, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si provider es Stripe: forzar status pending
  useEffect(() => {
    if (!open) return;
    if (provider === "stripe") {
      form.setFieldsValue({ paymentStatus: "pending" });
    }
  }, [provider, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si el total cambia y estás en total, no hay nada que ajustar.
  // Si estás en parcial, dejamos paymentAmount tal cual (usuario manda).

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);

      const total = Number(
        (v.amountOverride ?? selectedPrice?.amount ?? 0).toFixed(2),
      );
      const payNow =
        v.paymentType === "total"
          ? total
          : Number((v.paymentAmount ?? 0).toFixed(2));

      if (total <= 0) {
        message.error("El importe total debe ser mayor a 0.");
        return;
      }

      if (v.paymentType === "partial") {
        if (!payNow || payNow <= 0) {
          message.error("El pago parcial debe ser mayor a 0.");
          return;
        }
        if (payNow >= total) {
          message.error("El pago parcial debe ser menor al total.");
          return;
        }
      }

      const normalizedPaymentStatus =
        v.provider === "stripe" ? "pending" : v.paymentStatus;

      const payload = {
        restaurantId: Number(v.restaurantId),
        planPriceId: Number(v.planPriceId),
        subscriptionStatus: v.subscriptionStatus,
        startDateIso: v.startDateIso?.toISOString(),

        // TOTAL del periodo
        amountOverride: total,

        // Siempre registramos un pago (parcial o total)
        createPayment: true,
        paymentAmount: payNow,

        provider: v.provider,
        paymentStatus: normalizedPaymentStatus,

        // Solo aplica para no-stripe, si quieres guardar ref manual
        providerPaymentId:
          v.provider === "stripe" ? null : v.providerPaymentId || null,
      };

      const { data } = await apiCenter.post("/subscriptions/manual", payload);

      // Si Stripe, esperamos checkoutUrl
      const url = data?.checkoutUrl ? String(data.checkoutUrl) : null;
      setCheckoutUrl(url);

      if (v.provider === "stripe") {
        if (url) {
          message.success("Suscripción creada. Link de pago generado.");
        } else {
          message.warning(
            "Suscripción creada, pero checkoutUrl llegó null. Revisa backend: session.url y return.",
          );
        }
      } else {
        message.success("Suscripción creada");
      }

      await onCreated();
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear la suscripción");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = getTotal();
  const payNow = getPayNow();
  const remaining = Math.max(0, Number((totalAmount - payNow).toFixed(2)));

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
              label: `${formatInterval(pr.interval, pr.intervalCount)} — $${Number(pr.amount).toFixed(2)} ${
                pr.currency
              }${pr.isDefault ? " (predeterminado)" : ""}`,
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
              { value: "active", label: "Activa" },
              { value: "trialing", label: "En prueba" },
              { value: "paused", label: "Pausada" },
              { value: "canceled", label: "Cancelada" },
              { value: "expired", label: "Expirada" },
            ]}
          />
        </Form.Item>

        {/* TOTAL editable */}
        <Form.Item
          name="amountOverride"
          label="Importe total del periodo (MXN)"
          rules={[{ required: true, message: "Ingresa el importe total" }]}
        >
          <InputNumber style={{ width: "100%" }} min={0} step={10} />
        </Form.Item>

        {/* Tipo de pago */}
        <Form.Item
          name="paymentType"
          label="Pago"
          rules={[{ required: true, message: "Selecciona tipo de pago" }]}
        >
          <Radio.Group>
            <Radio value="total">Pago total</Radio>
            <Radio value="partial">Pago parcial</Radio>
          </Radio.Group>
        </Form.Item>

        {paymentType === "partial" && (
          <Form.Item
            name="paymentAmount"
            label="Monto a cobrar ahora (MXN)"
            rules={[
              { required: true, message: "Ingresa el monto a cobrar ahora" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={10} />
          </Form.Item>
        )}

        <div style={{ marginBottom: 12 }}>
          <Text strong>Resumen:</Text>{" "}
          <Text>
            Total {money(totalAmount, selectedPrice?.currency)} · Cobrar ahora{" "}
            {money(payNow, selectedPrice?.currency)} · Saldo{" "}
            {money(remaining, selectedPrice?.currency)}
          </Text>
        </div>

        {/* Provider + status */}
        <Space.Compact style={{ width: "100%", gap: 8 }}>
          <Form.Item
            name="provider"
            label="Proveedor"
            style={{ width: "50%" }}
            rules={[{ required: true, message: "Selecciona proveedor" }]}
          >
            <Select
              options={[
                { value: "cash", label: "Efectivo" },
                { value: "transfer", label: "Transferencia" },
                { value: "stripe", label: "Stripe (link)" },
              ]}
            />
          </Form.Item>

          {provider !== "stripe" ? (
            <Form.Item
              name="paymentStatus"
              label="Estado de pago"
              style={{ width: "50%" }}
              rules={[{ required: true, message: "Selecciona estado de pago" }]}
            >
              <Select
                options={[
                  { value: "succeeded", label: "Pagado" },
                  { value: "pending", label: "Pendiente" },
                  { value: "failed", label: "Fallido" },
                ]}
              />
            </Form.Item>
          ) : (
            <div style={{ width: "50%", paddingTop: 30 }}>
              <Text type="secondary">
                Stripe se registra como <Text strong>pendiente</Text> (auto).
              </Text>
            </div>
          )}
        </Space.Compact>

        {provider !== "stripe" && (
          <Form.Item name="providerPaymentId" label="Ref. pago (opcional)">
            <Input />
          </Form.Item>
        )}

        {/* Mostrar checkoutUrl si existe */}
        {checkoutUrl && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            <Text strong>Link de pago:</Text>
            <div style={{ marginTop: 6, wordBreak: "break-all" }}>
              {checkoutUrl}
            </div>
            <Space style={{ marginTop: 10 }}>
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(checkoutUrl);
                  message.success("Link copiado");
                }}
              >
                Copiar
              </Button>
            </Space>
          </div>
        )}
      </Form>
    </Modal>
  );
}

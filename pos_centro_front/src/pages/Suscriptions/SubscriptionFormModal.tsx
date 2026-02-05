import { useEffect, useMemo, useState } from "react";
import {
  Form,
  InputNumber,
  Modal,
  Select,
  Typography,
  Button,
  Space,
  Radio,
  message,
} from "antd";
import apiCenter from "@/components/apis/apiCenter";

const { Text } = Typography;

export type RestaurantOpt = { value: number; label: string };

export type PlanPriceOpt = {
  value: number; // planPriceId
  label: string;
  amount: number; // MXN
  currency?: string;
  interval?: string;
  intervalCount?: number;
};

export type ManualSubscriptionFormValues = {
  restaurantId: number;
  planPriceId: number;

  // TOTAL del periodo (override del precio del plan)
  amountOverride: number;

  // Tipo de pago del momento
  paymentType: "total" | "partial";

  // Monto a pagar AHORA (solo si es partial)
  paymentAmount?: number;

  provider: "cash" | "transfer" | "stripe";
  paymentStatus: "pending" | "succeeded";

  subscriptionStatus: "active" | "trialing" | "past_due" | "paused";
};

type Props = {
  open: boolean;
  loading?: boolean;
  restaurants: RestaurantOpt[];
  planPrices: PlanPriceOpt[];
  title: string;
  okText?: string;
  onCancel: () => void;
  onCreated: () => Promise<void> | void;
};

export default function SubscriptionFormModal({
  open,
  loading,
  restaurants,
  planPrices,
  title,
  okText = "Crear suscripción",
  onCancel,
  onCreated,
}: Props) {
  const [form] = Form.useForm<ManualSubscriptionFormValues>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const planPriceId = Form.useWatch("planPriceId", form);
  const provider = Form.useWatch("provider", form);
  const paymentType = Form.useWatch("paymentType", form);
  const amountOverride = Form.useWatch("amountOverride", form);

  const selectedPlan = useMemo(() => {
    return planPrices.find((p) => p.value === planPriceId) ?? null;
  }, [planPrices, planPriceId]);

  const money = (v?: number | null, currency?: string | null) =>
    `$${Number(v ?? 0).toFixed(2)} ${currency ?? "MXN"}`;

  const fmt = (v: any) =>
    v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const parse = (v?: string) => {
    const n = Number((v ?? "").replace(/[^\d.]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  };

  const getTotal = () => {
    const n = Number(
      form.getFieldValue("amountOverride") ?? selectedPlan?.amount ?? 0,
    );
    return Math.max(0, Number(n.toFixed(2)));
  };

  const getPayNow = () => {
    const total = getTotal();
    if (form.getFieldValue("paymentType") === "total") return total;
    const n = Number(form.getFieldValue("paymentAmount") ?? 0);
    return Math.max(0, Number(n.toFixed(2)));
  };

  // Init
  useEffect(() => {
    if (!open) return;

    setCheckoutUrl(null);
    form.resetFields();

    form.setFieldsValue({
      provider: "cash",
      paymentStatus: "pending",
      subscriptionStatus: "active",
      paymentType: "total",
      amountOverride: 0,
      paymentAmount: undefined,
    });
  }, [open, form]);

  // Cuando cambias el plan: total = precio del plan y pago tipo total
  useEffect(() => {
    if (!open) return;
    if (!selectedPlan) return;

    const total = Number(selectedPlan.amount ?? 0);

    form.setFieldsValue({
      amountOverride: total,
      paymentType: "total",
      paymentAmount: undefined,
    });
  }, [selectedPlan, open, form]);

  // Si cambia a pago TOTAL: limpiamos paymentAmount
  useEffect(() => {
    if (!open) return;
    if (paymentType === "total") {
      form.setFieldsValue({ paymentAmount: undefined });
    }
  }, [paymentType, open, form]);

  // Si el provider es STRIPE: forzar status a pending
  useEffect(() => {
    if (!open) return;
    if (provider === "stripe") {
      form.setFieldsValue({ paymentStatus: "pending" });
    }
  }, [provider, open, form]);

  // Si el total cambia y estás en TOTAL, no hay nada que ajustar porque payNow se calcula solo.
  // Si estás en parcial, dejamos el valor tal cual (usuario manda).

  const handleOk = async () => {
    const v = await form.validateFields();

    const total = Number(
      (v.amountOverride ?? selectedPlan?.amount ?? 0).toFixed(2),
    );
    const payNow =
      v.paymentType === "total"
        ? total
        : Number((v.paymentAmount ?? 0).toFixed(2));

    if (!Number.isFinite(total) || total <= 0) {
      message.error("El importe total debe ser mayor a 0.");
      return;
    }

    if (v.paymentType === "partial") {
      if (!Number.isFinite(payNow) || payNow <= 0) {
        message.error("El pago parcial debe ser mayor a 0.");
        return;
      }
      if (payNow >= total) {
        message.error("El pago parcial debe ser menor al total.");
        return;
      }
    }

    const normalizedPaymentStatus: "pending" | "succeeded" =
      v.provider === "stripe" ? "pending" : v.paymentStatus;

    setSubmitLoading(true);
    try {
      const payload = {
        restaurantId: v.restaurantId,
        planPriceId: v.planPriceId,
        subscriptionStatus: v.subscriptionStatus,

        // TOTAL del periodo
        amountOverride: total,

        // Siempre creamos el payment del momento (total o parcial)
        createPayment: true,
        paymentAmount: payNow,

        provider: v.provider,
        paymentStatus: normalizedPaymentStatus,
      };

      const { data } = await apiCenter.post("/subscriptions/manual", payload);

      const url = data?.checkoutUrl ? String(data.checkoutUrl) : null;
      setCheckoutUrl(url);

      if (v.provider === "stripe") {
        if (url) {
          message.success("Suscripción creada. Link de pago generado.");
        } else {
          message.warning(
            "Suscripción creada, pero no llegó el link de Stripe (checkoutUrl). Revisa backend: session.url.",
          );
        }
      } else {
        message.success("Suscripción creada.");
      }

      await onCreated();
    } catch (e: any) {
      console.error(e);
      message.error(
        e?.response?.data?.error || "No se pudo crear la suscripción",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalAmount = getTotal();
  const payNow = getPayNow();
  const remaining = Math.max(0, Number((totalAmount - payNow).toFixed(2)));

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      confirmLoading={!!loading || submitLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="restaurantId"
          label="Restaurante"
          rules={[{ required: true, message: "Selecciona un restaurante" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={restaurants}
            placeholder="Selecciona restaurante"
          />
        </Form.Item>

        <Form.Item
          name="planPriceId"
          label="Plan / Precio"
          rules={[{ required: true, message: "Selecciona un precio" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={planPrices.map((p) => ({
              value: p.value,
              label: `${p.label} — ${money(p.amount, p.currency)}`,
            }))}
            placeholder="Selecciona precio"
          />
        </Form.Item>

        {selectedPlan && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              Precio base: {money(selectedPlan.amount, selectedPlan.currency)} ·
              Intervalo: {selectedPlan.intervalCount ?? 1}{" "}
              {selectedPlan.interval ?? ""}
            </Text>
          </div>
        )}

        <Form.Item
          name="amountOverride"
          label="Importe total del periodo (MXN)"
          rules={[{ required: true, message: "Captura el importe total" }]}
        >
          <InputNumber<number>
            style={{ width: "100%" }}
            min={0}
            step={10}
            formatter={fmt}
            parser={parse}
          />
        </Form.Item>

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
            rules={[{ required: true, message: "Captura el monto a cobrar" }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={10}
              formatter={fmt}
              parser={parse}
            />
          </Form.Item>
        )}

        <div style={{ marginBottom: 12 }}>
          <Text strong>Resumen:</Text>{" "}
          <Text>
            Total {money(totalAmount, selectedPlan?.currency)} · Cobrar ahora{" "}
            {money(payNow, selectedPlan?.currency)} · Saldo{" "}
            {money(remaining, selectedPlan?.currency)}
          </Text>
        </div>

        <Form.Item
          name="provider"
          label="Método / Proveedor"
          rules={[{ required: true, message: "Selecciona un método" }]}
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
            label="Estado del pago"
            rules={[{ required: true, message: "Selecciona estado del pago" }]}
          >
            <Select
              options={[
                { value: "pending", label: "Pendiente" },
                { value: "succeeded", label: "Pagado" },
              ]}
            />
          </Form.Item>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              Stripe siempre se registra como <Text strong>pendiente</Text>{" "}
              hasta que el webhook lo confirme.
            </Text>
          </div>
        )}

        <Form.Item
          name="subscriptionStatus"
          label="Estado de suscripción"
          rules={[{ required: true, message: "Selecciona estado" }]}
        >
          <Select
            options={[
              { value: "active", label: "Activa" },
              { value: "trialing", label: "En prueba" },
              { value: "past_due", label: "Vencida" },
              { value: "paused", label: "Pausada" },
            ]}
          />
        </Form.Item>

        {checkoutUrl && <CardLikeUrl url={checkoutUrl} />}
      </Form>
    </Modal>
  );
}

function CardLikeUrl({ url }: { url: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
      }}
    >
      <Text strong>Link de pago:</Text>
      <div style={{ marginTop: 6, wordBreak: "break-all" }}>{url}</div>
      <Space style={{ marginTop: 10 }}>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            message.success("Link copiado");
          }}
        >
          Copiar
        </Button>
      </Space>
    </div>
  );
}

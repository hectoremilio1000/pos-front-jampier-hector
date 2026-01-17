// /src/components/SubscriptionEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Space,
  message,
} from "antd";
import dayjs from "dayjs";
import type { PlanPrice, SubscriptionRow } from "@/types/billing";
import apiCenter from "./apis/apiCenter";

export default function SubscriptionEditModal({
  open,
  subscription,
  onClose,
  onSaved,
}: {
  open: boolean;
  subscription: SubscriptionRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form] = Form.useForm<{
    status: SubscriptionRow["status"];
    currentPeriodStart?: any;
    currentPeriodEnd?: any;
    priceOverride?: number | null;
    recurringDiscountPercent?: number;
    recurringDiscount?: number;
    paidAt?: any;
    stripePaymentId?: string | null;
    planPriceId?: number | null;
  }>();
  const [saving, setSaving] = useState(false);
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([]);

  const formatInterval = (interval?: string | null, count?: number | null) => {
    const n = Number(count || 1);
    const map: Record<string, { s: string; p: string }> = {
      day: { s: "día", p: "días" },
      week: { s: "semana", p: "semanas" },
      month: { s: "mes", p: "meses" },
      year: { s: "año", p: "años" },
    };
    const m = map[String(interval)] ?? { s: String(interval), p: `${interval}s` };
    return n === 1 ? m.s : `${n} ${m.p}`;
  };

  const options = useMemo(
    () =>
      planPrices.map((pp) => ({
        value: pp.id,
        label: `#${pp.id} · Plan ${pp.planId} · ${formatInterval(
          pp.interval,
          pp.intervalCount
        )} · $${pp.amount} ${pp.currency}`,
      })),
    [planPrices]
  );

  useEffect(() => {
    if (!open) return;
    // cargar plan-prices (para corregir plan/intervalo si hiciera falta)
    apiCenter
      .get("/plan-prices")
      .then(({ data }) => setPlanPrices(data ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!subscription) return;
    form.setFieldsValue({
      status: subscription.status,
      currentPeriodStart: dayjs(subscription.currentPeriodStart),
      currentPeriodEnd: dayjs(subscription.currentPeriodEnd),
      priceOverride: subscription.priceOverride ?? null,
      recurringDiscountPercent: subscription.recurringDiscountPercent,
      recurringDiscount: subscription.recurringDiscount,
      paidAt: subscription.paidAt ? dayjs(subscription.paidAt) : undefined,
      stripePaymentId: subscription.stripePaymentId ?? undefined,
      planPriceId: subscription.planPriceId ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.id]);

  const handleOk = async () => {
    if (!subscription) return;
    try {
      const v = await form.validateFields();
      setSaving(true);
      // construir payload para PATCH
      const payload: Record<string, any> = {
        status: v.status,
        priceOverride: v.priceOverride ?? null,
        recurringDiscountPercent: v.recurringDiscountPercent ?? 0,
        recurringDiscount: v.recurringDiscount ?? 0,
      };
      if (v.currentPeriodStart)
        payload.currentPeriodStart = (
          v.currentPeriodStart as any
        ).toISOString();
      if (v.currentPeriodEnd)
        payload.currentPeriodEnd = (v.currentPeriodEnd as any).toISOString();
      if (v.paidAt) payload.paidAt = (v.paidAt as any).toISOString();
      if (v.stripePaymentId !== undefined)
        payload.stripePaymentId = v.stripePaymentId || null;
      if (v.planPriceId !== undefined)
        payload.planPriceId = v.planPriceId || null;

      await apiCenter.patch(`/subscriptions/${subscription.id}`, payload);
      message.success("Suscripción actualizada");
      await onSaved();
    } catch (e) {
      console.error(e);
      message.error("No se pudo actualizar la suscripción");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        subscription
          ? `Editar suscripción #${subscription.id}`
          : "Editar suscripción"
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText="Guardar"
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Estado" name="status" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Activa" },
              { value: "trialing", label: "En prueba" },
              { value: "past_due", label: "Vencida" },
              { value: "paused", label: "Pausada" },
              { value: "canceled", label: "Cancelada" },
              { value: "expired", label: "Expirada" },
            ]}
          />
        </Form.Item>

        <Space
          size="middle"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
        >
          <Form.Item label="Inicio del periodo" name="currentPeriodStart">
            <DatePicker showTime />
          </Form.Item>
          <Form.Item label="Fin del periodo" name="currentPeriodEnd">
            <DatePicker showTime />
          </Form.Item>
        </Space>

        <Space
          size="middle"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
        >
          <Form.Item label="Override de precio" name="priceOverride">
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
          </Form.Item>
          <Form.Item label="% Desc. recurrente" name="recurringDiscountPercent">
            <InputNumber style={{ width: "100%" }} min={0} max={100} step={1} />
          </Form.Item>
        </Space>

        <Form.Item
          label="Descuento recurrente (monto)"
          name="recurringDiscount"
        >
          <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
        </Form.Item>

        <Space
          size="middle"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
        >
          <Form.Item label="Pagado en" name="paidAt">
            <DatePicker showTime />
          </Form.Item>
          <Form.Item label="ID de pago Stripe" name="stripePaymentId">
            <Select
              showSearch
              allowClear
              placeholder="(opcional)"
              options={
                form.getFieldValue("stripePaymentId")
                  ? [
                      {
                        value: form.getFieldValue("stripePaymentId"),
                        label: form.getFieldValue("stripePaymentId"),
                      },
                    ]
                  : []
              }
              // simple input libre via Select+allowClear; si prefieres Input, cámbialo
            />
          </Form.Item>
        </Space>

        <Form.Item
          label="Precio del plan (corrección avanzada)"
          name="planPriceId"
        >
          <Select
            allowClear
            placeholder="Dejar vacío para no cambiar"
            options={options}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

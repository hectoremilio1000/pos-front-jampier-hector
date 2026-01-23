import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import apiCenter from "@/components/apis/apiCenter";
import type { SubscriptionRow } from "@/types/billing";

type CreatedNote = {
  id: number;
  subscriptionId: number;
  restaurantId: number;
  amountBase: number;
  discount: number;
  adjustments: number;
  amountDue: number;
  currency: string;
  status: string;
  dueAt: string;
  notes?: string | null;
};

type Props = {
  open: boolean;
  subscriptions: SubscriptionRow[];
  defaultSubscriptionId?: number | null;
  onClose: () => void;
  onCreated?: (note: CreatedNote) => void;
};

const statusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagada" },
  { value: "past_due", label: "Vencida" },
];

function getSubscriptionAmount(sub: SubscriptionRow) {
  if (sub.priceOverride != null && Number(sub.priceOverride) > 0) {
    return Number(sub.priceOverride);
  }
  if (sub.planPrice?.amount != null) return Number(sub.planPrice.amount);
  return null;
}

function getSubscriptionCurrency(sub: SubscriptionRow) {
  return sub.planPrice?.currency ?? "MXN";
}

export default function GenerateNoteModal({
  open,
  subscriptions,
  defaultSubscriptionId,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [createdNote, setCreatedNote] = useState<CreatedNote | null>(null);

  const subscriptionId = Form.useWatch("subscriptionId", form);

  const selectedSub = useMemo(
    () => subscriptions.find((s) => s.id === Number(subscriptionId)),
    [subscriptions, subscriptionId]
  );

  useEffect(() => {
    if (!open) return;
    setCreatedNote(null);
    const sub =
      subscriptions.find((s) => s.id === Number(defaultSubscriptionId)) ||
      subscriptions[0];
    const amount = sub ? getSubscriptionAmount(sub) : null;
    const currency = sub ? getSubscriptionCurrency(sub) : "MXN";
    const dueAt = sub?.currentPeriodEnd
      ? dayjs(sub.currentPeriodEnd)
      : dayjs();

    form.setFieldsValue({
      subscriptionId: sub?.id,
      amountBase: amount ?? undefined,
      discount: 0,
      adjustments: 0,
      currency,
      dueAt,
      status: "pending",
      paidAt: null,
      notes: "",
    });
  }, [open, defaultSubscriptionId, subscriptions, form]);

  useEffect(() => {
    if (!open || !selectedSub) return;
    const amount = getSubscriptionAmount(selectedSub);
    const currency = getSubscriptionCurrency(selectedSub);
    const dueAt = selectedSub.currentPeriodEnd
      ? dayjs(selectedSub.currentPeriodEnd)
      : dayjs();
    form.setFieldsValue({
      amountBase: amount ?? undefined,
      currency,
      dueAt,
    });
  }, [open, selectedSub?.id, form, selectedSub]);

  const amountBase = Form.useWatch("amountBase", form);
  const discount = Form.useWatch("discount", form);
  const adjustments = Form.useWatch("adjustments", form);
  const status = Form.useWatch("status", form);

  const total = useMemo(() => {
    const base = Number(amountBase || 0);
    const d = Number(discount || 0);
    const a = Number(adjustments || 0);
    return Math.max(0, base - d + a);
  }, [amountBase, discount, adjustments]);

  const handleSubmit = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      const periodStart = selectedSub?.currentPeriodStart ?? null;
      const periodEnd = selectedSub?.currentPeriodEnd ?? null;
      const payload = {
        subscriptionId: v.subscriptionId,
        amountBase: Number(v.amountBase),
        discount: Number(v.discount || 0),
        adjustments: Number(v.adjustments || 0),
        currency: v.currency,
        dueAt: v.dueAt?.toISOString(),
        periodStart,
        periodEnd,
        status: v.status,
        paidAt: v.status === "paid" ? v.paidAt?.toISOString() : null,
        notes: v.notes || null,
      };
      const { data } = await apiCenter.post("/invoices", payload);
      setCreatedNote(data);
      onCreated?.(data);
      message.success("Nota generada");
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.error || "No se pudo generar la nota";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!createdNote) return;
    const url = `/notes/${createdNote.id}/print`;
    window.location.href = url;
  };

  return (
    <Modal
      title="Generar nota por cobrar"
      open={open}
      onCancel={onClose}
      footer={
        createdNote ? (
          <Space>
            <Button onClick={handlePrint}>Imprimir nota</Button>
            <Button type="primary" onClick={onClose}>
              Cerrar
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={handleSubmit}>
              Generar nota
            </Button>
          </Space>
        )
      }
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="subscriptionId"
          label="Suscripcion"
          rules={[{ required: true, message: "Selecciona una suscripcion" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Selecciona una suscripcion"
            options={subscriptions.map((s) => ({
              value: s.id,
              label: `${s.id} — ${s.restaurant?.name ?? s.restaurantId}`,
            }))}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large" align="start" wrap>
          <Form.Item
            name="amountBase"
            label="Monto base"
            rules={[{ required: true, message: "Monto requerido" }]}
          >
            <InputNumber min={0} precision={2} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="discount" label="Descuento">
            <InputNumber min={0} precision={2} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="adjustments" label="Ajustes">
            <InputNumber min={0} precision={2} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="currency" label="Moneda">
            <Select
              style={{ width: 140 }}
              options={[
                { value: "MXN", label: "MXN" },
                { value: "USD", label: "USD" },
              ]}
            />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size="large" align="start" wrap>
          <Form.Item
            name="dueAt"
            label="Vencimiento"
            rules={[{ required: true, message: "Vencimiento requerido" }]}
          >
            <DatePicker showTime />
          </Form.Item>
          <Form.Item name="status" label="Estado">
            <Select options={statusOptions} style={{ width: 200 }} />
          </Form.Item>
          {status === "paid" && (
            <Form.Item
              name="paidAt"
              label="Fecha de pago"
              rules={[{ required: true, message: "Fecha requerida" }]}
            >
              <DatePicker showTime />
            </Form.Item>
          )}
        </Space>

        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Typography.Text strong>
          Total a cobrar: ${total.toFixed(2)}
        </Typography.Text>
      </Form>
    </Modal>
  );
}

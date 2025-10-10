// /src/components/PaymentFormModal.tsx
import { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCenter from "@/apis/apiCenter";
import type { PaymentRow } from "@/types/billing";

export default function PaymentFormModal({
  open,
  mode,
  restaurantId,
  subscriptionId,
  row,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  restaurantId: number;
  subscriptionId: number | null;
  row?: PaymentRow;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  // 👉 Tipo específico del formulario (paidAt es Dayjs)
  type PaymentFormValues = {
    amount?: number;
    currency?: string;
    provider?: string;
    status?: "succeeded" | "pending" | "failed" | "refunded";
    providerPaymentId?: string;
    providerSessionId?: string;
    paidAt?: Dayjs; // ← aquí está la clave
    notes?: string;
  };

  const [form] = Form.useForm<PaymentFormValues>();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && row) {
      form.setFieldsValue({
        amount: row.amount,
        currency: row.currency || "MXN",
        provider: row.provider,
        providerPaymentId: row.providerPaymentId || undefined,
        providerSessionId: row.providerSessionId || undefined,
        status: row.status,
        paidAt: row.paidAt ? dayjs(row.paidAt) : undefined,
        notes: row.notes || undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        currency: "MXN",
        status: "succeeded",
        provider: "cash",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, row?.id]);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      if (isEdit && row) {
        const payload: any = {
          amount: Number(v.amount),
          currency: v.currency,
          provider: v.provider,
          providerPaymentId: v.providerPaymentId || null,
          providerSessionId: v.providerSessionId || null,
          status: v.status,
          notes: v.notes || null,
        };
        // ✅ convertir Dayjs → ISO string solo en el payload
        if (v.paidAt) payload.paidAt = v.paidAt.toISOString();
        await apiCenter.patch(`/subscription-payments/${row.id}`, payload);
        message.success("Pago actualizado");
      } else {
        const payload: any = {
          restaurantId,
          subscriptionId,
          amount: Number(v.amount),
          currency: v.currency,
          provider: v.provider,
          providerPaymentId: v.providerPaymentId || null,
          providerSessionId: v.providerSessionId || null,
          status: v.status,
          // paidAt lo inferirá el server si status === 'succeeded'
          notes: v.notes || null,
        };
        await apiCenter.post(`/subscription-payments/register`, payload);
        message.success("Pago registrado");
      }
      await onSaved();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar el pago");
    }
  };

  return (
    <Modal
      title={isEdit ? "Editar pago" : "Registrar pago"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
    >
      <Form layout="vertical" form={form}>
        <Form.Item name="amount" label="Importe" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="currency" label="Moneda" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "MXN", label: "MXN" },
              { value: "USD", label: "USD" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="provider"
          label="Proveedor"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            options={[
              { value: "cash", label: "cash" },
              { value: "transfer", label: "transfer" },
              { value: "stripe", label: "stripe" },
              { value: "mp", label: "mercadopago" },
            ]}
          />
        </Form.Item>
        <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "succeeded", label: "succeeded" },
              { value: "pending", label: "pending" },
              { value: "failed", label: "failed" },
              { value: "refunded", label: "refunded" },
            ]}
          />
        </Form.Item>
        <Form.Item name="providerPaymentId" label="Referencia (opcional)">
          <Input placeholder="Folio / Intent ID / Transferencia" />
        </Form.Item>
        <Form.Item name="providerSessionId" label="Session ID (opcional)">
          <Input placeholder="Checkout / Session ID" />
        </Form.Item>
        <Form.Item name="paidAt" label="Fecha de pago (opcional)">
          <DatePicker showTime />
        </Form.Item>
        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

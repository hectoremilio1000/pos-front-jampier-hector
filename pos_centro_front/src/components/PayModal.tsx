import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import type { TabsProps } from "antd";
import apiCenter from "@/components/apis/apiCenter";
import type { InvoiceRow } from "@/pages/Invoices/InvoicesTable";

type Props = {
  open: boolean;
  invoice: InvoiceRow | null;
  onClose: () => void;
  onPaid?: () => void; // callback para refrescar
};

type RegisterForm = {
  amount: number;
  method: "cash" | "card_tpv" | "transfer";
  reference?: string;
  notes?: string;
};

const { Text } = Typography;

export default function PayModal({ open, invoice, onClose, onPaid }: Props) {
  const [activeKey, setActiveKey] = useState<"offline" | "online">("offline");
  const [loading, setLoading] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // summary de pagos (opcional si tienes endpoint)
  const [paidTotal, setPaidTotal] = useState<number>(0);
  const remaining = useMemo(() => {
    const due = Number(invoice?.amountDue ?? 0);
    const paid = Number(paidTotal ?? 0);
    return Math.max(0, +(due - paid).toFixed(2));
  }, [invoice, paidTotal]);

  const [form] = Form.useForm<RegisterForm>();

  // Carga summary de pagos si existe endpoint
  const loadSummary = async () => {
    if (!invoice) return;
    try {
      const { data } = await apiCenter.get(`/invoices/${invoice.id}/payments`);
      const summaryPaid = Number(data?.summary?.paidTotal ?? 0);
      setPaidTotal(summaryPaid);
    } catch {
      // si no existe el endpoint aún, asumimos 0 (la UI sigue funcionando)
      setPaidTotal(0);
    }
  };

  useEffect(() => {
    if (open && invoice) {
      setActiveKey("offline");
      setCheckoutUrl(null);
      loadSummary();
      form.setFieldsValue({
        amount: remaining > 0 ? remaining : Number(invoice.amountDue ?? 0),
        method: "cash",
        reference: "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice]);

  const submitRegister = async () => {
    if (!invoice) return;
    try {
      const v = await form.validateFields();
      setLoading(true);
      await apiCenter.post(`/invoices/${invoice.id}/payments/register`, {
        amount: Number(v.amount),
        method: v.method,
        reference: v.reference || undefined,
        notes: v.notes || undefined,
      });
      message.success("Pago registrado");
      onClose();
      onPaid?.();
    } catch (e) {
      console.error(e);
      message.error("No se pudo registrar el pago");
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (provider: "stripe" | "mercadopago") => {
    if (!invoice) return;
    try {
      setCreatingLink(true);
      setCheckoutUrl(null);
      const { data } = await apiCenter.post(
        `/invoices/${invoice.id}/payments/checkout`,
        {
          provider,
        }
      );
      const url: string | undefined = data?.url;
      if (!url) throw new Error("No se recibió URL de checkout");
      setCheckoutUrl(url);
      message.success("Enlace de pago creado");
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear el enlace de pago");
    } finally {
      setCreatingLink(false);
    }
  };

  const items: TabsProps["items"] = [
    {
      key: "offline",
      label: "Registrar pago",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>Total:</Text> $
            {Number(invoice?.amountDue ?? 0).toFixed(2)} {invoice?.currency}
            &nbsp;&nbsp;
            <Text type="secondary">Pagado:</Text> $
            {Number(paidTotal).toFixed(2)}
            &nbsp;&nbsp;
            <Text type="warning">Pendiente:</Text> ${remaining.toFixed(2)}
          </div>

          <Form form={form} layout="vertical">
            <Form.Item
              name="amount"
              label="Importe (MXN)"
              rules={[{ required: true, message: "Ingresa el importe" }]}
            >
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={1}
                formatter={(v) =>
                  v == null
                    ? ""
                    : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(v) => {
                  const n = Number((v ?? "").replace(/[^\d.]/g, ""));
                  return Number.isNaN(n) ? 0 : n;
                }}
              />
            </Form.Item>

            <Form.Item
              name="method"
              label="Método"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "cash", label: "Efectivo" },
                  { value: "card_tpv", label: "Tarjeta (TPV)" },
                  { value: "transfer", label: "Transferencia" },
                ]}
              />
            </Form.Item>

            <Form.Item name="reference" label="Referencia (opcional)">
              <Input placeholder="Folio TPV / # transferencia / nota" />
            </Form.Item>

            <Form.Item name="notes" label="Notas (opcional)">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>

          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" loading={loading} onClick={submitRegister}>
              Guardar pago
            </Button>
          </Space>
        </Space>
      ),
    },
    {
      key: "online",
      label: "Cobrar en línea",
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>Total:</Text> $
            {Number(invoice?.amountDue ?? 0).toFixed(2)} {invoice?.currency}
            &nbsp;&nbsp;
            <Text type="secondary">Pagado:</Text> $
            {Number(paidTotal).toFixed(2)}
            &nbsp;&nbsp;
            <Text type="warning">Pendiente:</Text> ${remaining.toFixed(2)}
          </div>

          <Space>
            <Button
              loading={creatingLink}
              onClick={() => createCheckout("stripe")}
            >
              Enlace Stripe
            </Button>
            <Button
              loading={creatingLink}
              onClick={() => createCheckout("mercadopago")}
            >
              Enlace Mercado Pago
            </Button>
          </Space>

          {checkoutUrl && (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Input value={checkoutUrl} readOnly />
              <Space wrap>
                <Button type="primary" href={checkoutUrl} target="_blank">
                  Abrir enlace
                </Button>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(checkoutUrl);
                    message.success("Enlace copiado");
                  }}
                >
                  Copiar enlace
                </Button>
              </Space>
              <Text type="secondary">
                La factura se marcará como <b>pagada</b> cuando recibamos la
                confirmación del proveedor (webhook).
              </Text>
            </Space>
          )}

          <Space>
            <Button onClick={onClose}>Cerrar</Button>
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Cobrar — Factura #${invoice?.id ?? ""}`}
      open={open}
      onCancel={onClose}
      footer={false}
      destroyOnClose
    >
      <Tabs
        items={items}
        activeKey={activeKey}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange={(k) => setActiveKey(k as any)}
      />
    </Modal>
  );
}

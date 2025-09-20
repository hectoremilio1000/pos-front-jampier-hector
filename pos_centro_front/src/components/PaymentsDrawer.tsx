import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import apiCenter from "@/apis/apiCenter";
import type { InvoiceRow } from "@/components/InvoicesTable";

type Props = {
  open: boolean;
  invoice: InvoiceRow | null;
  onClose: () => void;
  onChanged?: () => void; // para refrescar la lista de facturas si un reverso cambia el status
};

type PaymentRow = {
  id: number;
  invoiceId: number;
  method: "cash" | "card_tpv" | "transfer" | "stripe" | "mercadopago";
  amount: number; // MXN
  fee: number; // MXN
  currency: string;
  status: "succeeded" | "pending" | "failed" | "reversed" | "voided";
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt?: string;
};

const { Text } = Typography;

export default function PaymentsDrawer({
  open,
  invoice,
  onClose,
  onChanged,
}: Props) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number>(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editForm] = Form.useForm<{ reference?: string; notes?: string }>();

  const remaining = useMemo(() => {
    const due = Number(invoice?.amountDue ?? 0);
    return Math.max(0, +(due - Number(paidTotal)).toFixed(2));
  }, [invoice, paidTotal]);

  const fetchPayments = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const { data } = await apiCenter.get(`/invoices/${invoice.id}/payments`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: PaymentRow[] = (data?.items ?? []).map((p: any) => ({
        ...p,
        amount: Number(p.amount ?? 0),
        fee: Number(p.fee ?? 0),
      }));
      setRows(items);
      setPaidTotal(Number(data?.summary?.paidTotal ?? 0));
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar pagos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id]);

  const openEdit = (p: PaymentRow) => {
    setEditPayment(p);
    editForm.setFieldsValue({
      reference: p.reference ?? "",
      notes: p.notes ?? "",
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    try {
      const v = await editForm.validateFields();
      await apiCenter.patch(`/invoice_payments/${editPayment!.id}`, {
        reference: v.reference || null,
        notes: v.notes || null,
      });
      message.success("Pago actualizado");
      setEditOpen(false);
      fetchPayments();
      onChanged?.();
    } catch (e) {
      console.error(e);
      message.error("No se pudo actualizar el pago");
    }
  };

  const revertPayment = (p: PaymentRow) => {
    Modal.confirm({
      title: "Revertir pago",
      content:
        "Esto creará una reversa (o marcará el pago como revertido) y actualizará el saldo de la factura.",
      okText: "Revertir",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await apiCenter.post(`/invoice_payments/${p.id}/revert`, {});
          message.success("Pago revertido");
          fetchPayments();
          onChanged?.();
        } catch (e) {
          console.error(e);
          message.error("No se pudo revertir el pago");
        }
      },
    });
  };

  return (
    <Drawer
      title={`Pagos — Factura #${invoice?.id ?? ""}`}
      open={open}
      width={640}
      onClose={onClose}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <div>
          <Text strong>Total:</Text> $
          {Number(invoice?.amountDue ?? 0).toFixed(2)} {invoice?.currency}
          &nbsp;&nbsp;
          <Text type="secondary">Pagado:</Text> ${Number(paidTotal).toFixed(2)}
          &nbsp;&nbsp;
          <Text type="warning">Saldo:</Text> ${remaining.toFixed(2)}
          &nbsp;&nbsp;
          <Text
            type={
              invoice?.status === "paid"
                ? "success"
                : invoice?.status === "past_due"
                  ? "danger"
                  : "secondary"
            }
          >
            Estado: {invoice?.status}
          </Text>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={[
            {
              title: "Fecha",
              dataIndex: "paidAt",
              render: (v?: string) =>
                v ? new Date(v).toLocaleString("es-MX") : "—",
              width: 160,
            },
            {
              title: "Método",
              dataIndex: "method",
              width: 130,
              render: (m: PaymentRow["method"]) => <Tagify text={m} />,
            },
            {
              title: "Importe",
              dataIndex: "amount",
              render: (v: number) => `$${v.toFixed(2)}`,
              width: 120,
            },
            {
              title: "Fee",
              dataIndex: "fee",
              render: (v: number) => `$${v.toFixed(2)}`,
              width: 100,
            },
            {
              title: "Referencia",
              dataIndex: "reference",
              width: 160,
              ellipsis: true,
            },
            { title: "Notas", dataIndex: "notes", ellipsis: true },
            {
              title: "Estatus",
              dataIndex: "status",
              width: 120,
              render: (s: PaymentRow["status"]) => (
                <Tagify
                  text={s}
                  map={{
                    succeeded: "green",
                    pending: "orange",
                    failed: "red",
                    reversed: "red",
                    voided: "default",
                  }}
                />
              ),
            },
            {
              title: "Acciones",
              key: "actions",
              width: 180,
              render: (_, p) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(p)}>
                    Editar
                  </Button>
                  {p.status === "succeeded" && (
                    <Button
                      size="small"
                      danger
                      onClick={() => revertPayment(p)}
                    >
                      Revertir
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />

        {/* Editar referencia / notas */}
        <Modal
          title="Editar pago"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={submitEdit}
          okText="Guardar"
          destroyOnClose
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="reference" label="Referencia">
              <Input placeholder="Folio TPV / ref transferencia" />
            </Form.Item>
            <Form.Item name="notes" label="Notas">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </Drawer>
  );
}

function Tagify({ text, map }: { text: string; map?: Record<string, string> }) {
  const color =
    map?.[text] ??
    (text === "cash" ? "green" : text === "transfer" ? "blue" : "purple");

  return <span className={`ant-tag ant-tag-${color}`}>{text}</span>;
}

// /src/pages/Admin/Subscriptions.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { type Dayjs } from "dayjs";
import apiCenter from "@/components/apis/apiCenter";
import ManualSubscriptionModal from "@/components/ManualSubscriptionModal";
import SubscriptionEditModal from "@/components/SubscriptionEditModal";
import GenerateNoteModal from "@/components/GenerateNoteModal";

import PaymentsDrawer from "@/components/PaymentsDrawer";
import type { InvoiceRow } from "@/pages/Invoices/InvoicesTable";
import type { SubscriptionRow } from "@/types/billing";
import { transmit } from "@/lib/transmit";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const formatInterval = (interval?: string | null, count?: number | null) => {
  if (!interval) return "-";
  const n = Number(count || 1);
  const map: Record<string, { s: string; p: string }> = {
    day: { s: "día", p: "días" },
    week: { s: "semana", p: "semanas" },
    month: { s: "mes", p: "meses" },
    year: { s: "año", p: "años" },
  };
  const unit = map[interval] ?? { s: interval, p: `${interval}s` };
  return n === 1 ? unit.s : `${n} ${unit.p}`;
};

const subscriptionStatusLabel = (value: string) => {
  const map: Record<string, string> = {
    active: "Activa",
    trialing: "En prueba",
    past_due: "Vencida",
    paused: "Pausada",
    canceled: "Cancelada",
    expired: "Expirada",
  };
  return map[value] ?? value;
};

export default function Subscriptions() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentBySub, setPaymentBySub] = useState<
    Record<
      number,
      { status: "paid" | "pending" | "overdue"; invoice: InvoiceRow | null }
    >
  >({});
  const [newPayOpen, setNewPayOpen] = useState(false);

  // filtros
  const [form] = Form.useForm<{
    restaurantName?: string;
    status?: string;
    dates?: [Dayjs, Dayjs];
    paymentStatus?: "paid" | "pending" | "overdue";
  }>();
  const paymentFilter = Form.useWatch("paymentStatus", form);

  // drawer de pagos
  // Drawer único: Nota + Pagos (1:1)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [activeSub, setActiveSub] = useState<SubscriptionRow | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceRow | null>(null);

  const [invoicePaid, setInvoicePaid] = useState(0);
  const [invoiceBalance, setInvoiceBalance] = useState(0);

  type PaymentRow = {
    id: number;
    invoiceId: number;
    paidAt?: string | null;
    method?: string | null;
    amount: number;
    status: string;
    reference?: string | null;
    checkoutUrl?: string | null; // ✅ nuevo
  };

  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // modal detalle pago
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(
    null,
  );

  // const [cfdiLoading, setCfdiLoading] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [paymentsInvoice, setPaymentsInvoice] = useState<InvoiceRow | null>(
    null,
  );
  // modal editar suscripción
  const [editOpen, setEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionRow | null>(null);

  const hasBlockingStripePending = useMemo(() => {
    if (!activeInvoice) return false;
    const due = Number(activeInvoice.amountDue ?? 0);

    // Suma de pagos ya pagados (por seguridad, usa invoicePaid que ya viene calculado)
    const balance = Number(invoiceBalance ?? Math.max(0, due - invoicePaid));

    // Si no hay saldo, no bloquea (ya está pagado)
    if (balance <= 0) return false;

    // Buscar pagos stripe pendientes cuyo monto cubre el saldo COMPLETO
    const blockers = payments.filter(
      (p) =>
        p.method === "stripe" &&
        p.status === "pending" &&
        Number(p.amount ?? 0) >= balance,
    );

    return blockers.length > 0;
  }, [payments, activeInvoice, invoiceBalance, invoicePaid]);
  const canCreateNewPayment =
    !!activeInvoice &&
    invoiceBalance > 0 &&
    !hasBlockingStripePending &&
    activeInvoice.status !== "paid" &&
    activeInvoice.status !== "void";

  const periodLabel = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "—";
    const fmt = new Intl.DateTimeFormat("es-MX", {
      month: "short",
      year: "numeric",
    });
    const startLabel = fmt.format(new Date(start));
    const endLabel = fmt.format(new Date(end));
    return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
  };
  const money = (v?: number | null, currency?: string | null) =>
    `$${Number(v ?? 0).toFixed(2)} ${currency ?? "MXN"}`;
  const shortDate = (v?: string | null) =>
    v
      ? new Date(v).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
      : "-";

  const fetchData = async () => {
    setLoading(true);
    try {
      const v = form.getFieldsValue();
      const params: Record<string, string> = {};
      if (v.restaurantName) params.restaurantName = v.restaurantName;
      if (v.status) params.status = v.status;
      if (v.dates && v.dates?.length === 2) {
        params.from = v.dates[0].startOf("day").toISOString();
        params.to = v.dates[1].endOf("day").toISOString();
      }
      const qs = new URLSearchParams(params).toString();
      const { data } = await apiCenter.get(
        `/subscriptions${qs ? `?${qs}` : ""}`,
      );
      setRows(data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeInvoices = (data: any[]) =>
    (data ?? []).map((r: any) => ({
      ...r,
      amountBase: Number(r.amountBase ?? 0),
      discount: Number(r.discount ?? 0),
      adjustments: Number(r.adjustments ?? 0),
      amountDue: Number(r.amountDue ?? 0),
    })) as InvoiceRow[];

  const pickLatestInvoice = (items: InvoiceRow[]) => {
    if (!items.length) return null;
    return items.slice().sort((a, b) => {
      const da = new Date(a.dueAt || a.periodEnd || a.createdAt || 0).getTime();
      const db = new Date(b.dueAt || b.periodEnd || b.createdAt || 0).getTime();
      if (da === db) return Number(b.id) - Number(a.id);
      return db - da;
    })[0];
  };

  const computePaymentStatus = (invoice: InvoiceRow | null) => {
    if (!invoice) return null;
    if (invoice.status === "paid") return "paid";
    if (invoice.status === "past_due") return "overdue";
    if (
      invoice.status === "pending" &&
      invoice.dueAt &&
      new Date(invoice.dueAt).getTime() < Date.now()
    ) {
      return "overdue";
    }
    return "pending";
  };

  const loadPaymentStatuses = async (subs: SubscriptionRow[]) => {
    if (!subs.length) {
      setPaymentBySub({});
      return;
    }
    setPaymentLoading(true);
    try {
      const entries = await Promise.all(
        subs
          .filter((s) => s.id)
          .map(async (s) => {
            try {
              const { data } = await apiCenter.get(
                `/invoices?subscriptionId=${s.id}`,
              );
              const items = normalizeInvoices(data);
              const last = pickLatestInvoice(items);
              const status = computePaymentStatus(last);
              if (!status)
                return [s.id as number, { status: "pending", invoice: null }];
              return [s.id as number, { status, invoice: last }];
            } catch (e) {
              console.error(e);
              return [s.id as number, { status: "pending", invoice: null }];
            }
          }),
      );
      setPaymentBySub(Object.fromEntries(entries));
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentStatuses(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const openPayments = async (sub: SubscriptionRow) => {
    setActiveSub(sub);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setActiveInvoice(null);
    setPayments([]);
    setInvoicePaid(0);
    setInvoiceBalance(0);

    try {
      // 1) Traer invoice(s) por subscriptionId y quedarnos con el más reciente
      const params = new URLSearchParams();
      if (sub.id) params.set("subscriptionId", String(sub.id));
      if (sub.restaurantId)
        params.set("restaurantId", String(sub.restaurantId));

      const { data } = await apiCenter.get(`/invoices?${params.toString()}`);
      const norm: InvoiceRow[] = normalizeInvoices(data);
      const inv = pickLatestInvoice(norm);

      setActiveInvoice(inv ?? null);

      if (!inv?.id) return;

      // 2) Traer pagos de ese invoice
      const { data: payData } = await apiCenter.get(
        `/invoices/${inv.id}/payments`,
      );

      const items = Array.isArray(payData?.items) ? payData.items : [];
      const paid = Number(payData?.invoice?.paid ?? 0);
      const balance = Number(
        payData?.invoice?.balance ??
          Math.max(0, Number(inv.amountDue ?? 0) - paid),
      );

      setInvoicePaid(paid);
      setInvoiceBalance(balance);

      setPayments(
        items.map((p: any) => ({
          id: Number(p.id),
          invoiceId: Number(inv.id),
          paidAt: p.paidAt ?? null,
          method: p.method ?? null,
          amount: Number(p.amount ?? 0),
          status: String(p.status ?? ""),
          reference: p.reference ?? null,
          checkoutUrl: p.checkoutUrl ?? p.checkout_url ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar nota/pagos");
    } finally {
      setDrawerLoading(false);
    }
  };
  useEffect(() => {
    if (!drawerOpen) return;
    if (!activeSub?.id) return;

    const sub = transmit.subscription(`billing:subscription:${activeSub.id}`);

    const off = sub.onMessage(async (msg: any) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== "payment_confirmed") return;

      // 1) refresca tabla (status pago de suscripción)
      await fetchData();

      // 2) refresca drawer si corresponde
      if (
        activeSub?.id &&
        Number(msg.subscriptionId) === Number(activeSub.id)
      ) {
        await openPayments(activeSub);
      }
    });

    sub.create().catch((e: any) => console.error("[transmit] create error", e));

    return () => {
      off?.();
      sub.delete().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, activeSub?.id]);

  const handleEmitCfdi = (invoice: InvoiceRow) => {
    if (!activeSub) return;
    Modal.confirm({
      title: "Emitir factura CFDI",
      content: `Se emitirá CFDI de la nota #${invoice.id}.`,
      okText: "Emitir CFDI",
      cancelText: "Cancelar",
      async onOk() {
        try {
          // setCfdiLoading(true);
          await apiCenter.post("/saas/invoices/issue", {
            restaurantId: invoice.restaurantId,
            invoiceId: invoice.id,
          });
          message.success("Factura CFDI emitida");
        } catch (e: any) {
          console.error(e);
          const msg =
            e?.response?.data?.error || "No se pudo emitir la factura CFDI";
          message.error(msg);
        } finally {
          // setCfdiLoading(false);
        }
      },
    });
  };

  const columns: ColumnsType<SubscriptionRow> = [
    {
      title: "Creada",
      key: "createdAt",
      width: 90,
      render: (_, r) => shortDate(r.createdAt),
      sorter: (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Restaurante",
      key: "restaurant",
      width: 220,
      ellipsis: true,
      render: (_, r) =>
        r.restaurant
          ? `${r.restaurant.id} — ${r.restaurant.name}`
          : r.restaurantId,
    },
    {
      title: "Plan",
      key: "plan",
      width: 90,
      render: (_, r) => r.plan?.name || r.planId,
    },
    {
      title: "Periodo",
      key: "period",
      width: 90,
      render: (_, r) =>
        r.planPrice ? (
          <Tag>
            {formatInterval(r.planPrice.interval, r.planPrice.intervalCount)}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Monto",
      key: "amount",
      width: 120,
      render: (_, r) =>
        r.planPrice
          ? `$${Number(r.planPrice.amount).toFixed(2)} ${r.planPrice.currency}`
          : "-",
    },
    {
      title: "Vigencia",
      key: "dates",
      width: 140,
      render: (_, r) =>
        `${shortDate(r.currentPeriodStart)} → ${shortDate(r.currentPeriodEnd)}`,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v, r) => {
        const leftDays = Math.max(
          Math.floor(
            (new Date(r.currentPeriodEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
          0,
        );
        const nearing = (v === "active" || v === "trialing") && leftDays <= 7;
        return (
          <Tag
            color={
              v === "active"
                ? "green"
                : v === "trialing"
                  ? "blue"
                  : v === "canceled"
                    ? "red"
                    : v === "expired"
                      ? "default"
                      : "default"
            }
          >
            {subscriptionStatusLabel(v)}{" "}
            {nearing ? `· vence en ${leftDays}d` : ""}
          </Tag>
        );
      },
    },
    {
      title: "Estado de pago",
      key: "paymentStatus",
      width: 120,
      render: (_, r) => {
        const info = paymentBySub[r.id];
        if (!info || paymentLoading) return "-";
        const color =
          info.status === "paid"
            ? "green"
            : info.status === "overdue"
              ? "red"
              : "blue";
        const label =
          info.status === "paid"
            ? "Pagada"
            : info.status === "overdue"
              ? "Vencida"
              : "Pendiente";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "actions",
      width: 170,
      render: (_, r) => {
        const inv = paymentBySub[r.id]?.invoice;
        const items = [
          {
            key: "notas",
            label: "Notas",
            onClick: () => openPayments(r),
          },
          {
            key: "cfdi",
            label: "CFDI",
            disabled: !inv,
            onClick: () => {
              if (!inv) return;
              handleEmitCfdi(inv);
            },
          },
          {
            key: "editar",
            label: "Editar",
            onClick: () => {
              setEditingSub(r);
              setEditOpen(true);
            },
          },
        ];
        return (
          <Space>
            <Button size="small" type="primary" onClick={() => openPayments(r)}>
              Ver pagos
            </Button>

            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button size="small">Más ▾</Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const filteredRows = useMemo(() => {
    if (!paymentFilter) return rows;
    return rows.filter((r) => paymentBySub[r.id]?.status === paymentFilter);
  }, [rows, paymentBySub, paymentFilter]);

  const sortedRows = useMemo(() => {
    return filteredRows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
  }, [filteredRows]);

  return (
    <Card
      title="Suscripciones"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          Nueva suscripción
        </Button>
      }
    >
      <Form
        form={form}
        layout="inline"
        onFinish={fetchData}
        style={{ marginBottom: 12 }}
      >
        <Form.Item name="restaurantName" label="Restaurante">
          <Input placeholder="Buscar por nombre" allowClear />
        </Form.Item>
        <Form.Item name="status" label="Estado">
          <Select
            allowClear
            style={{ width: 180 }}
            options={[
              { value: "active", label: "Activa" },
              { value: "trialing", label: "En prueba" },
              { value: "paused", label: "Pausada" },
              { value: "canceled", label: "Cancelada" },
              { value: "expired", label: "Expirada" },
            ]}
            placeholder="—"
          />
        </Form.Item>
        <Form.Item name="paymentStatus" label="Pago">
          <Select
            allowClear
            style={{ width: 180 }}
            options={[
              { value: "pending", label: "Pendientes" },
              { value: "overdue", label: "Vencidas" },
              { value: "paid", label: "Pagadas" },
            ]}
            placeholder="—"
          />
        </Form.Item>
        <Form.Item name="dates" label="Rango">
          <RangePicker allowEmpty={[true, true]} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                fetchData();
              }}
            >
              Limpiar
            </Button>
            <Button type="primary" htmlType="submit">
              Filtrar
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={sortedRows}
        columns={columns}
        size="small"
      />

      {/* Crear manualmente */}
      <ManualSubscriptionModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          await fetchData();
        }}
      />

      {/* Drawer de pagos */}
      <Drawer
        title={
          activeSub
            ? `Detalle — Sub #${activeSub.id} (${activeSub.restaurant?.name ?? activeSub.restaurantId})`
            : "Detalle"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="80vw"
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <h1>Nota:</h1>
          <h1>{activeInvoice ? `#${activeInvoice.id}` : "—"}</h1>

          <h1>Total:</h1>
          <h1>
            {money(activeInvoice?.amountDue ?? 0, activeInvoice?.currency)}
          </h1>

          <h1>Pagado:</h1>
          <h1>{money(invoicePaid, activeInvoice?.currency)}</h1>

          <h1>Saldo:</h1>
          <h1>{money(invoiceBalance, activeInvoice?.currency)}</h1>
        </Space>

        <Card size="small" style={{ marginBottom: 12 }}>
          <Space wrap>
            <h1>Periodo:</h1>
            <h1>
              {activeInvoice
                ? periodLabel(
                    activeInvoice.periodStart,
                    activeInvoice.periodEnd,
                  )
                : "—"}
            </h1>

            <h1>Estado:</h1>
            <Tag
              color={
                activeInvoice?.status === "paid"
                  ? "green"
                  : activeInvoice?.status === "pending"
                    ? "blue"
                    : activeInvoice?.status === "past_due"
                      ? "red"
                      : "default"
              }
            >
              {activeInvoice?.status
                ? ((
                    {
                      paid: "Pagada",
                      pending: "Pendiente",
                      past_due: "Vencida",
                      void: "Anulada",
                    } as any
                  )[activeInvoice.status] ?? activeInvoice.status)
                : "—"}
            </Tag>

            <h1>Vence:</h1>
            <h1>
              {activeInvoice?.dueAt
                ? new Date(activeInvoice.dueAt).toLocaleDateString("es-MX")
                : "—"}
            </h1>
          </Space>
        </Card>
        <Space
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Button
            type="primary"
            disabled={!canCreateNewPayment}
            onClick={() => setNewPayOpen(true)}
          >
            Nuevo pago
          </Button>
        </Space>
        {!canCreateNewPayment && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">
              {invoiceBalance <= 0
                ? "Esta nota ya está cubierta."
                : hasBlockingStripePending
                  ? "Ya existe un link de Stripe pendiente que cubre el saldo. Espera a que se pague o cámbialo a efectivo."
                  : "No disponible."}
            </Text>
          </div>
        )}

        <Table
          rowKey="id"
          loading={drawerLoading}
          dataSource={payments}
          size="small"
          columns={[
            {
              title: "Fecha",
              dataIndex: "paidAt",
              width: 180,
              render: (v?: string) =>
                v ? new Date(v).toLocaleString("es-MX") : "—",
            },
            {
              title: "Método",
              dataIndex: "method",
              width: 140,
              render: (m: string) => m || "—",
            },
            {
              title: "Importe",
              dataIndex: "amount",
              width: 140,
              render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
            },
            {
              title: "Estado",
              dataIndex: "status",
              width: 120,
              render: (s: string) => (
                <Tag
                  color={
                    s === "succeeded"
                      ? "green"
                      : s === "pending"
                        ? "blue"
                        : "red"
                  }
                >
                  {s}
                </Tag>
              ),
            },
            {
              title: "Referencia",
              dataIndex: "reference",
              ellipsis: true,
            },
            {
              title: "Acciones",
              width: 140,
              render: (_: any, row: any) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedPayment(row);
                      setPaymentDetailOpen(true);
                    }}
                  >
                    Ver
                  </Button>

                  {row?.method === "stripe" &&
                    row?.status === "pending" &&
                    row?.checkoutUrl && (
                      <Button
                        size="small"
                        onClick={async () => {
                          await navigator.clipboard.writeText(row.checkoutUrl);
                          message.success("Link copiado");
                        }}
                      >
                        Copiar link
                      </Button>
                    )}
                </Space>
              ),
            },
          ]}
        />

        {/* Modal detalle del pago */}
        <PaymentDetailModal
          open={paymentDetailOpen}
          payment={selectedPayment}
          currency={activeInvoice?.currency ?? "MXN"}
          onClose={() => {
            setPaymentDetailOpen(false);
            setSelectedPayment(null);
          }}
          onUpdated={async () => {
            if (activeSub) await openPayments(activeSub);
          }}
        />
        <NewPaymentModal
          open={newPayOpen}
          invoice={activeInvoice}
          balance={invoiceBalance}
          onClose={() => setNewPayOpen(false)}
          onCreated={async () => {
            if (activeSub) await openPayments(activeSub);
          }}
        />
      </Drawer>

      {/* Modal Editar suscripción */}
      <SubscriptionEditModal
        open={editOpen}
        subscription={editingSub}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          await fetchData();
        }}
      />

      <PaymentsDrawer
        open={!!paymentsInvoice}
        invoice={paymentsInvoice}
        onClose={() => setPaymentsInvoice(null)}
        onChanged={async () => {
          if (activeSub) {
            await openPayments(activeSub);
          }
        }}
      />

      <GenerateNoteModal
        open={noteModalOpen}
        subscriptions={rows}
        defaultSubscriptionId={activeSub?.id ?? null}
        onClose={() => setNoteModalOpen(false)}
        onCreated={async () => {
          if (activeSub) {
            await openPayments(activeSub);
          }
        }}
      />
    </Card>
  );
}

function PaymentDetailModal({
  open,
  payment,
  currency,
  onClose,
  onUpdated,
}: {
  open: boolean;
  payment: any | null;
  currency: string;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !payment) return;
    form.resetFields();
    form.setFieldsValue({
      method: payment.method ?? "stripe",
    });
  }, [open, payment, form]);

  if (!payment) return null;

  const isPaid = payment.status === "succeeded";
  const isStripe = (payment.method ?? "") === "stripe";

  const checkoutUrl: string | null =
    payment.checkoutUrl ?? payment.checkout_url ?? null;

  const canShowCheckout =
    isStripe && payment.status === "pending" && !!checkoutUrl;

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);

      // Ajusta si tu endpoint es otro:
      await apiCenter.patch(`/invoice-payments/${payment.id}`, {
        method: v.method,
      });

      message.success("Pago actualizado");
      await onUpdated();
      onClose();
    } catch (e) {
      console.error(e);
      message.error("No se pudo actualizar el pago");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Pago #${payment.id}`}
      open={open}
      onCancel={onClose}
      onOk={isPaid ? onClose : handleSave}
      okText={isPaid ? "Cerrar" : "Guardar"}
      confirmLoading={saving}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {/* Estado + importe */}
        <Card size="small">
          <Space wrap>
            <Text type="secondary">Estado:</Text>
            <Tag
              color={
                payment.status === "succeeded"
                  ? "green"
                  : payment.status === "pending"
                    ? "blue"
                    : "red"
              }
            >
              {payment.status}
            </Tag>

            <Text type="secondary">Importe:</Text>
            <Text strong>
              ${Number(payment.amount ?? 0).toFixed(2)} {currency}
            </Text>

            <Text type="secondary">Fecha:</Text>
            <Text>
              {payment.paidAt
                ? new Date(payment.paidAt).toLocaleString("es-MX")
                : "—"}
            </Text>
          </Space>
        </Card>

        {/* Reference */}
        <Card size="small" title="Referencia">
          <div style={{ wordBreak: "break-all" }}>
            {payment.reference ? (
              <Text code>{payment.reference}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </div>
        </Card>

        {/* Checkout URL */}
        <Card size="small" title="Link de pago (Stripe)">
          {canShowCheckout ? (
            <>
              <div style={{ wordBreak: "break-all" }}>
                <Text code>{checkoutUrl}</Text>
              </div>

              <Space style={{ marginTop: 10 }}>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(checkoutUrl!);
                    message.success("Link copiado");
                  }}
                >
                  Copiar link
                </Button>
                <Button
                  type="primary"
                  onClick={() =>
                    window.open(checkoutUrl!, "_blank", "noopener,noreferrer")
                  }
                >
                  Abrir
                </Button>
              </Space>

              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  Si el link expira, genera un nuevo pago desde “Cobrar”.
                </Text>
              </div>
            </>
          ) : (
            <Text type="secondary">
              {isStripe
                ? "No hay link disponible (solo aplica cuando está pendiente)."
                : "Este pago no es Stripe."}
            </Text>
          )}
        </Card>

        {/* Editar método (solo si NO está pagado) */}
        <Card size="small" title="Editar método">
          <Form form={form} layout="vertical">
            <Form.Item
              name="method"
              label="Método"
              rules={[{ required: true }]}
            >
              <Select
                disabled={isPaid}
                options={[
                  { value: "stripe", label: "Stripe" },
                  { value: "cash", label: "Efectivo" },
                  { value: "transfer", label: "Transferencia" },
                ]}
              />
            </Form.Item>
          </Form>

          {isPaid && (
            <Text type="secondary">
              Este pago ya está pagado; no se puede modificar el método.
            </Text>
          )}
        </Card>
      </Space>
    </Modal>
  );
}
function NewPaymentModal({
  open,
  invoice,
  balance,
  onClose,
  onCreated,
}: {
  open: boolean;
  invoice: InvoiceRow | null;
  balance: number;
  onClose: () => void;
  onCreated: (created?: any) => Promise<void> | void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const provider = Form.useWatch("provider", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      provider: "cash",
      amount: Number(balance ?? 0),
      paymentStatus: "succeeded",
    });
  }, [open, balance, form]);

  useEffect(() => {
    if (!open) return;
    if (provider === "stripe") {
      form.setFieldsValue({ paymentStatus: "pending" });
    }
  }, [provider, open, form]);

  if (!invoice) return null;

  const handleOk = async () => {
    const v = await form.validateFields();
    const amount = Number(v.amount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      message.error("El monto debe ser mayor a 0.");
      return;
    }
    if (amount > balance) {
      message.error("El monto no puede ser mayor al saldo.");
      return;
    }

    setSaving(true);
    try {
      // 🚨 Ajusta al endpoint real que estés usando para crear un payment sobre un invoice:
      // Ideal: POST /invoices/:id/payments
      setSaving(true);
      try {
        if (v.provider === "stripe") {
          // ✅ Stripe: pedir link al backend (y backend crea invoice_payment pending)
          const { data } = await apiCenter.post(
            `/invoices/${invoice.id}/payments/checkout`,
            {
              provider: "stripe",
              amount, // ✅ este amount es el parcial
              // opcional si tu backend lo usa:
              // successUrl: import.meta.env.VITE_PUBLIC_CHECKOUT_SUCCESS_URL,
              // cancelUrl: import.meta.env.VITE_PUBLIC_CHECKOUT_CANCEL_URL,
            },
          );

          const checkoutUrl =
            data?.checkoutUrl ??
            data?.url ??
            data?.payment?.checkoutUrl ??
            null;

          if (checkoutUrl) {
            await navigator.clipboard.writeText(String(checkoutUrl));
            message.success("Pago creado. Link copiado.");
          } else {
            message.error("No se generó link.");
          }

          await onCreated(data);
          onClose();
          return;
        }

        // ✅ Offline: register
        const { data } = await apiCenter.post(
          `/invoices/${invoice.id}/payments/register`,
          {
            method: v.provider, // cash | transfer
            amount,
            reference: null,
            notes: null,
          },
        );

        message.success("Pago registrado.");
        await onCreated(data);
        onClose();
      } catch (e) {
        console.error(e);
        message.error("No se pudo crear el pago");
      } finally {
        setSaving(false);
      }
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear el pago");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Nuevo pago — Nota #${invoice.id}`}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Crear pago"
      confirmLoading={saving}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Saldo actual">
          <Text strong>
            ${Number(balance ?? 0).toFixed(2)} {invoice.currency ?? "MXN"}
          </Text>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Monto a cobrar ahora"
          rules={[{ required: true, message: "Ingresa el monto" }]}
        >
          <InputNumber style={{ width: "100%" }} min={0} step={10} />
        </Form.Item>

        <Form.Item
          name="provider"
          label="Método"
          rules={[{ required: true, message: "Selecciona método" }]}
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
            label="Estado"
            rules={[{ required: true }]}
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
          <Text type="secondary">
            Stripe se registra como <Text strong>pendiente</Text> y se confirma
            con webhook.
          </Text>
        )}
      </Form>
    </Modal>
  );
}

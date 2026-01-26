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
import PayModal from "@/components/PayModal";
import PaymentsDrawer from "@/components/PaymentsDrawer";
import type { InvoiceRow } from "@/pages/Invoices/InvoicesTable";
import type { SubscriptionRow } from "@/types/billing";

const { RangePicker } = DatePicker;

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

  // filtros
  const [form] = Form.useForm<{
    restaurantName?: string;
    status?: string;
    dates?: [Dayjs, Dayjs];
    paymentStatus?: "paid" | "pending" | "overdue";
  }>();
  const paymentFilter = Form.useWatch("paymentStatus", form);

  // drawer de pagos
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceSummaries, setInvoiceSummaries] = useState<
    Record<number, { paid: number; balance: number }>
  >({});
  const [subPaymentsOpen, setSubPaymentsOpen] = useState(false);
  const [subPaymentsLoading, setSubPaymentsLoading] = useState(false);
  const [subPaymentsRows, setSubPaymentsRows] = useState<
    Array<{
      id: string;
      invoiceId: number;
      period: string;
      invoiceAmount: number;
      paidAt?: string | null;
      method?: string;
      amount: number;
      status: string;
      reference?: string | null;
    }>
  >([]);
  const [activeSub, setActiveSub] = useState<SubscriptionRow | null>(null);
  // const [cfdiLoading, setCfdiLoading] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null);
  const [paymentsInvoice, setPaymentsInvoice] = useState<InvoiceRow | null>(
    null,
  );
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
  const { Text } = Typography;
  // modal editar suscripción
  const [editOpen, setEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionRow | null>(null);
  // modal cobrar nota
  const [payModalOpen, setPayModalOpen] = useState(false);
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
    try {
      const params = new URLSearchParams();
      if (sub.id) params.set("subscriptionId", String(sub.id));
      if (sub.restaurantId)
        params.set("restaurantId", String(sub.restaurantId));
      const { data } = await apiCenter.get(`/invoices?${params.toString()}`);
      const norm: InvoiceRow[] = normalizeInvoices(data);
      setInvoices(norm);
      const summaries = await Promise.all(
        norm.map(async (inv) => {
          try {
            const { data: payData } = await apiCenter.get(
              `/invoices/${inv.id}/payments`,
            );
            const paid = Number(payData?.invoice?.paid ?? 0);
            const balance = Number(payData?.invoice?.balance ?? 0);
            return [inv.id, { paid, balance }];
          } catch (e) {
            console.error(e);
            return [
              inv.id,
              {
                paid: 0,
                balance: Number(inv.amountDue ?? 0),
              },
            ];
          }
        }),
      );
      setInvoiceSummaries(Object.fromEntries(summaries));
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las notas");
    } finally {
      setDrawerLoading(false);
    }
  };

  const subscriptionTotals = useMemo(() => {
    const total = invoices.reduce(
      (acc, inv) => acc + Number(inv.amountDue ?? 0),
      0,
    );
    const paid = invoices.reduce(
      (acc, inv) => acc + Number(invoiceSummaries[inv.id]?.paid ?? 0),
      0,
    );
    const balance = Math.max(0, +(total - paid).toFixed(2));
    return { total, paid, balance };
  }, [invoices, invoiceSummaries]);

  const openSubscriptionPayments = async () => {
    if (!invoices.length) return;
    setSubPaymentsOpen(true);
    setSubPaymentsLoading(true);
    try {
      const rows = await Promise.all(
        invoices.map(async (inv) => {
          const { data: payData } = await apiCenter.get(
            `/invoices/${inv.id}/payments`,
          );
          const items = Array.isArray(payData?.items) ? payData.items : [];
          return items.map((p: any) => ({
            id: `${inv.id}-${p.id}`,
            invoiceId: inv.id,
            period: periodLabel(inv.periodStart, inv.periodEnd),
            invoiceAmount: Number(inv.amountDue ?? 0),
            paidAt: p.paidAt ?? null,
            method: p.method,
            amount: Number(p.amount ?? 0),
            status: String(p.status ?? ""),
            reference: p.reference ?? null,
          }));
        }),
      );
      setSubPaymentsRows(rows.flat());
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los pagos");
    } finally {
      setSubPaymentsLoading(false);
    }
  };

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
        const canPay = !!inv && paymentBySub[r.id]?.status !== "paid";
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
            <Button
              size="small"
              type="primary"
              disabled={!canPay}
              onClick={() => {
                setActiveSub(r);
                setPayInvoice(inv ?? null);
                setPayModalOpen(true);
              }}
            >
              Registrar pago
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
            ? `Notas — Sub #${activeSub.id} (${activeSub.restaurant?.name ?? activeSub.restaurantId})`
            : "Notas"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="80vw"
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Text strong>Total facturado:</Text>
          <Text>{money(subscriptionTotals.total, invoices[0]?.currency)}</Text>
          <Text type="secondary">Pagado:</Text>
          <Text>{money(subscriptionTotals.paid, invoices[0]?.currency)}</Text>
          <Text type="warning">Saldo:</Text>
          <Text>
            {money(subscriptionTotals.balance, invoices[0]?.currency)}
          </Text>
          <Button
            size="small"
            onClick={openSubscriptionPayments}
            disabled={!invoices.length}
          >
            Pagos de suscripción
          </Button>
        </Space>
        <Table<InvoiceRow>
          rowKey="id"
          loading={drawerLoading}
          dataSource={invoices}
          columns={[
            { title: "ID", dataIndex: "id" },
            {
              title: "Periodo",
              render: (_, r) => periodLabel(r.periodStart, r.periodEnd),
            },
            {
              title: "Importe",
              render: (_, r) =>
                `$${Number(r.amountDue ?? 0).toFixed(2)} ${r.currency}`,
            },
            {
              title: "Estado",
              dataIndex: "status",
              render: (v: InvoiceRow["status"]) => (
                <Tag
                  color={
                    v === "paid"
                      ? "green"
                      : v === "pending"
                        ? "blue"
                        : v === "past_due"
                          ? "red"
                          : "default"
                  }
                >
                  {{
                    paid: "Pagada",
                    pending: "Pendiente",
                    past_due: "Vencida",
                    void: "Anulada",
                  }[v] ?? v}
                </Tag>
              ),
            },
            {
              title: "Vence",
              dataIndex: "dueAt",
              render: (v) => (v ? new Date(v).toLocaleDateString() : "-"),
            },
            {
              title: "Pagado",
              render: (_, r) =>
                money(invoiceSummaries[r.id]?.paid ?? 0, r.currency),
            },
            {
              title: "Saldo",
              render: (_, r) =>
                money(
                  invoiceSummaries[r.id]?.balance ?? r.amountDue,
                  r.currency,
                ),
            },
            {
              title: "Acciones",
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    disabled={row.status === "paid" || row.status === "void"}
                    onClick={() => {
                      setPayInvoice(row);
                      setPayModalOpen(true);
                    }}
                  >
                    Cobrar
                  </Button>
                </Space>
              ),
            },
          ]}
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

      {/* Cobrar nota */}
      <PayModal
        open={payModalOpen}
        invoice={payInvoice}
        onClose={() => setPayModalOpen(false)}
        onPaid={async () => {
          setPayModalOpen(false);
          await fetchData();
          if (drawerOpen && activeSub) {
            await openPayments(activeSub);
          }
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

      <Drawer
        title={
          activeSub
            ? `Pagos — Sub #${activeSub.id} (${activeSub.restaurant?.name ?? activeSub.restaurantId})`
            : "Pagos"
        }
        open={subPaymentsOpen}
        onClose={() => setSubPaymentsOpen(false)}
        width={800}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>Total facturado:</Text>{" "}
            {money(subscriptionTotals.total, invoices[0]?.currency)}
            &nbsp;&nbsp;
            <Text type="secondary">Pagado:</Text>{" "}
            {money(subscriptionTotals.paid, invoices[0]?.currency)}
            &nbsp;&nbsp;
            <Text type="warning">Saldo:</Text>{" "}
            {money(subscriptionTotals.balance, invoices[0]?.currency)}
          </div>
          <Table
            rowKey="id"
            loading={subPaymentsLoading}
            dataSource={subPaymentsRows}
            columns={[
              {
                title: "Factura",
                dataIndex: "invoiceId",
                width: 100,
              },
              {
                title: "Periodo",
                dataIndex: "period",
                width: 160,
              },
              {
                title: "Importe factura",
                dataIndex: "invoiceAmount",
                render: (v: number) => `$${Number(v).toFixed(2)}`,
                width: 140,
              },
              {
                title: "Fecha",
                dataIndex: "paidAt",
                render: (v?: string) =>
                  v ? new Date(v).toLocaleString("es-MX") : "—",
                width: 180,
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
                render: (v: number) => `$${Number(v).toFixed(2)}`,
                width: 120,
              },
              {
                title: "Estado",
                dataIndex: "status",
                width: 120,
              },
              {
                title: "Referencia",
                dataIndex: "reference",
                ellipsis: true,
              },
            ]}
          />
        </Space>
      </Drawer>

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

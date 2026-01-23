import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

type PlanInfo = {
  name?: string | null;
  code?: string | null;
};

type PlanPriceInfo = {
  interval?: string | null;
  intervalCount?: number | null;
  amount?: number | null;
  currency?: string | null;
};

type SubscriptionInfo = {
  id: number;
  plan?: PlanInfo | null;
  planPrice?: PlanPriceInfo | null;
};

type InvoiceInfo = {
  id: number;
  folio?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  amountDue?: number | null;
  currency?: string | null;
  status?: string | null;
};

export type SaasInvoiceRow = {
  id: number;
  restaurantId: number;
  restaurant?: { id: number; name: string } | null;
  subscription?: SubscriptionInfo | null;
  invoiceId?: number | null;
  invoice?: InvoiceInfo | null;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: string;
  facturapiUuid?: string | null;
  mediaPdfUrl?: string | null;
  mediaXmlUrl?: string | null;
  mediaZipUrl?: string | null;
};

type Props = {
  rows: SaasInvoiceRow[];
  loading?: boolean;
  apiBase?: string;
};

function formatPlanLabel(row: SaasInvoiceRow) {
  const planName = row.subscription?.plan?.name || row.subscription?.plan?.code;
  const price = row.subscription?.planPrice;
  if (!planName) return "—";
  if (!price?.interval) return planName;
  const n = price.intervalCount && price.intervalCount > 1 ? price.intervalCount : 1;
  const map: Record<string, { s: string; p: string }> = {
    day: { s: "día", p: "días" },
    week: { s: "semana", p: "semanas" },
    month: { s: "mes", p: "meses" },
    year: { s: "año", p: "años" },
  };
  const unit = map[price.interval] ?? { s: price.interval, p: `${price.interval}s` };
  const intervalLabel = n === 1 ? unit.s : `${n} ${unit.p}`;
  return `${planName} · ${intervalLabel}`;
}

function tagForStatus(status?: string | null) {
  if (!status) return <Tag>—</Tag>;
  if (status === "valid") return <Tag color="green">Vigente</Tag>;
  if (status === "canceled") return <Tag color="red">Cancelada</Tag>;
  if (status === "pending") return <Tag color="blue">Pendiente</Tag>;
  return <Tag>{status}</Tag>;
}

function invoiceLabel(invoice?: InvoiceInfo | null, invoiceId?: number | null) {
  if (!invoice && !invoiceId) return "—";
  const id = invoice?.id ?? invoiceId;
  const folio = invoice?.folio ? ` · ${invoice.folio}` : "";
  if (invoice?.periodStart && invoice?.periodEnd) {
    return `#${id}${folio} · ${invoice.periodStart} → ${invoice.periodEnd}`;
  }
  return `#${id}${folio}`;
}

export default function SaasInvoicesTable({ rows, loading, apiBase }: Props) {
  const base = apiBase?.replace(/\/$/, "") ?? "";

  const columns: ColumnsType<SaasInvoiceRow> = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "Restaurante",
      dataIndex: "restaurant",
      width: 200,
      render: (_: unknown, row) => row.restaurant?.name ?? row.restaurantId,
    },
    {
      title: "Plan",
      key: "plan",
      width: 200,
      render: (_: unknown, row) => formatPlanLabel(row),
    },
    {
      title: "Periodo",
      key: "period",
      width: 200,
      render: (_: unknown, row) => `${row.periodStart} → ${row.periodEnd}`,
    },
    {
      title: "Monto",
      dataIndex: "amount",
      width: 130,
      render: (v: number, row) => `$${Number(v).toFixed(2)} ${row.currency}`,
    },
    {
      title: "Nota ligada",
      key: "invoice",
      width: 260,
      render: (_: unknown, row) => (
        <Typography.Text>{invoiceLabel(row.invoice, row.invoiceId)}</Typography.Text>
      ),
    },
    {
      title: "UUID",
      dataIndex: "facturapiUuid",
      width: 240,
      render: (v?: string | null) => v ?? "—",
    },
    {
      title: "Estado",
      dataIndex: "status",
      width: 120,
      render: (v?: string | null) => tagForStatus(v),
    },
    {
      title: "Archivos",
      key: "files",
      width: 220,
      render: (_: unknown, row) => {
        const pdfUrl = row.mediaPdfUrl || (base ? `${base}/saas/invoices/${row.id}/pdf` : "");
        const xmlUrl = row.mediaXmlUrl || (base ? `${base}/saas/invoices/${row.id}/xml` : "");
        const zipUrl = row.mediaZipUrl || (base ? `${base}/saas/invoices/${row.id}/zip` : "");

        return (
          <Space>
            <Button size="small" href={pdfUrl} target="_blank" disabled={!pdfUrl}>
              PDF
            </Button>
            <Button size="small" href={xmlUrl} target="_blank" disabled={!xmlUrl}>
              XML
            </Button>
            <Button size="small" href={zipUrl} target="_blank" disabled={!zipUrl}>
              ZIP
            </Button>
          </Space>
        );
      },
    },
  ];

  return <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} />;
}

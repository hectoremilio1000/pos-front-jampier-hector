import { Button, Dropdown, Space, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";

export type InvoiceStatus = "pending" | "paid" | "past_due" | "void";

export type InvoiceRow = {
  id: number;
  restaurantId: number;
  restaurantName?: string | null;
  subscriptionId: number;
  amountBase: number; // MXN
  discount: number; // MXN
  adjustments: number; // MXN
  amountDue: number; // MXN
  currency: string;
  status: InvoiceStatus;
  dueAt: string;
  notes?: string | null;
};

type Props = {
  rows: InvoiceRow[];
  restaurantsMap: Map<number, string>;
  loading?: boolean;
  onOpenPay: (row: InvoiceRow) => void;
  onOpenAdjust: (id: number) => void;
  onOpenEditDue: (row: InvoiceRow) => void;
  onOpenPayments?: (row: InvoiceRow) => void; // opcional
  onVoid: (id: number) => void;
};

export default function InvoicesTable({
  rows,
  restaurantsMap,
  loading,
  onOpenPay,
  onOpenAdjust,
  onOpenEditDue,
  onOpenPayments,
  onVoid,
}: Props) {
  const columns: ColumnsType<InvoiceRow> = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "Restaurante",
      key: "restaurant",
      width: 220,
      render: (_: unknown, row) =>
        row.restaurantName ??
        restaurantsMap.get(row.restaurantId) ??
        row.restaurantId,
    },
    {
      title: "Base",
      dataIndex: "amountBase",
      render: (v: number, r) => `$${Number(v).toFixed(2)} ${r.currency}`,
    },
    {
      title: "Descuento",
      dataIndex: "discount",
      render: (v: number) => `-$${Number(v).toFixed(2)}`,
    },
    {
      title: "Ajustes",
      dataIndex: "adjustments",
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: "Total",
      dataIndex: "amountDue",
      render: (v: number, r) => (
        <b>{`$${Number(v).toFixed(2)} ${r.currency}`}</b>
      ),
    },
    {
      title: "Vence",
      dataIndex: "dueAt",
      width: 180,
      render: (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (s: InvoiceStatus) =>
        s === "paid" ? (
          <Tag color="green">paid</Tag>
        ) : s === "pending" ? (
          <Tag color="blue">pending</Tag>
        ) : s === "past_due" ? (
          <Tag color="red">past_due</Tag>
        ) : (
          <Tag>void</Tag>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 420,
      render: (_: unknown, row) => {
        const canPay = row.status === "pending" || row.status === "past_due";
        const menuItems: MenuProps["items"] = [
          {
            key: "ajuste",
            label: "Ajuste / Descuento",
            disabled: row.status === "paid" || row.status === "void",
            onClick: () => onOpenAdjust(row.id),
          },
          {
            key: "vencimiento",
            label: "Vencimiento / Notas",
            disabled: row.status === "paid" || row.status === "void",
            onClick: () => onOpenEditDue(row),
          },
        ];
        if (onOpenPayments) {
          menuItems.unshift({
            key: "pagos",
            label: "Pagos…",
            onClick: () => onOpenPayments(row),
          });
        }

        return (
          <Space wrap>
            <Button
              size="small"
              type="primary"
              disabled={!canPay}
              onClick={() => onOpenPay(row)}
            >
              Pagar
            </Button>

            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button size="small">Editar ▾</Button>
            </Dropdown>

            {row.status !== "void" && (
              <Button size="small" danger onClick={() => onVoid(row.id)}>
                Anular
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} />
  );
}

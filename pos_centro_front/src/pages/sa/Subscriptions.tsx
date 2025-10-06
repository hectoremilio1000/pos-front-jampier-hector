// /src/pages/Admin/Subscriptions.tsx
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import apiCenter from "@/apis/apiCenter";
import ManualSubscriptionModal from "@/components/ManualSubscriptionModal";

type PlanPrice = {
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number;
  currency: string;
};
type Sub = {
  id: number;
  restaurantId: number;
  planId: number;
  planPriceId: number;
  status: string;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paidAt?: string | null;
  stripePaymentId?: string | null;
  planPrice?: PlanPrice;
  plan?: { name: string };
  restaurant?: { id: number; name: string };
};

type PayRow = {
  id: number;
  subscriptionId: number | null;
  planPriceId: number | null;
  restaurantId: number;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId?: string | null;
  providerSessionId?: string | null;
  status: "succeeded" | "pending" | "failed" | "refunded";
  paidAt?: string | null;
  createdAt: string;
};

const { RangePicker } = DatePicker;

export default function Subscriptions() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // filtros
  const [form] = Form.useForm<{
    restaurantName?: string;
    status?: string;
    dates?: [Dayjs, Dayjs];
  }>();

  // drawer de pagos
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [activeSub, setActiveSub] = useState<Sub | null>(null);

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
        `/subscriptions${qs ? `?${qs}` : ""}`
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

  const openPayments = async (sub: Sub) => {
    setActiveSub(sub);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("restaurantId", String(sub.restaurantId));
      if (sub.id) params.set("subscriptionId", String(sub.id)); // requiere que agregues este filtro en backend
      const { data } = await apiCenter.get(
        `/subscription-payments?${params.toString()}`
      );
      setPayments(data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los pagos");
    } finally {
      setDrawerLoading(false);
    }
  };

  const columns: ColumnsType<Sub> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "Restaurante",
      key: "restaurant",
      render: (_, r) =>
        r.restaurant
          ? `${r.restaurant.id} — ${r.restaurant.name}`
          : r.restaurantId,
    },
    { title: "Plan", key: "plan", render: (_, r) => r.plan?.name || r.planId },
    {
      title: "Periodo",
      key: "period",
      render: (_, r) =>
        r.planPrice ? (
          <Tag>{`${r.planPrice.interval}/${r.planPrice.intervalCount}`}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Monto",
      key: "amount",
      render: (_, r) =>
        r.planPrice
          ? `$${Number(r.planPrice.amount).toFixed(2)} ${r.planPrice.currency}`
          : "-",
    },
    {
      title: "Vigencia",
      key: "dates",
      render: (_, r) =>
        `${new Date(r.currentPeriodStart).toLocaleDateString()} → ${new Date(r.currentPeriodEnd).toLocaleDateString()}`,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => (
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
          {v}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openPayments(r)}>
            Pagos
          </Button>
        </Space>
      ),
    },
  ];

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
              { value: "active", label: "active" },
              { value: "trialing", label: "trialing" },
              { value: "paused", label: "paused" },
              { value: "canceled", label: "canceled" },
              { value: "expired", label: "expired" },
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
        dataSource={rows}
        columns={columns}
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
            ? `Pagos — Sub #${activeSub.id} (${activeSub.restaurant?.name ?? activeSub.restaurantId})`
            : "Pagos"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        <Table<PayRow>
          rowKey="id"
          loading={drawerLoading}
          dataSource={payments}
          columns={[
            { title: "ID", dataIndex: "id" },
            {
              title: "Importe",
              render: (_, r) => `$${r.amount.toFixed(2)} ${r.currency}`,
            },
            { title: "Proveedor", dataIndex: "provider" },
            { title: "Ref", dataIndex: "providerPaymentId" },
            {
              title: "Estado",
              dataIndex: "status",
              render: (v) => (
                <Tag
                  color={
                    v === "succeeded"
                      ? "green"
                      : v === "failed"
                        ? "red"
                        : v === "pending"
                          ? "blue"
                          : "default"
                  }
                >
                  {v}
                </Tag>
              ),
            },
            {
              title: "Pagado",
              dataIndex: "paidAt",
              render: (v) => (v ? new Date(v).toLocaleString() : "-"),
            },
            {
              title: "Creado",
              dataIndex: "createdAt",
              render: (v) => new Date(v).toLocaleString(),
            },
          ]}
        />
      </Drawer>
    </Card>
  );
}

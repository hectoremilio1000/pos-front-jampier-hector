import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCenter from "@/apis/apiCenter";
import apiAuth from "@/apis/apiAuth";

type Restaurant = { id: number; name: string };
type InvoiceStatus = "pending" | "paid" | "past_due" | "void";

type Invoice = {
  id: number;
  restaurantId: number;
  subscriptionId: number;
  amountBaseCents: number;
  discountCents: number;
  adjustmentsCents: number;
  amountDueCents: number;
  currency: string;
  status: InvoiceStatus;
  dueAt: string;
  notes?: string | null;
};

export default function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus | undefined>(undefined);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | undefined>(
    undefined
  );

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [form] = Form.useForm<{
    discountCents?: number;
    adjustmentCents?: number;
    notes?: string;
  }>();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/invoices", {
        params: { status, restaurantId },
      });
      setRows(data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [status, restaurantId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiAuth.get("/restaurants");
        setRestaurants(r.data.data ?? r.data);
      } catch (e) {
        console.error(e);
        message.error("No se pudieron cargar restaurantes");
      }
    })();
  }, []);

  const markPaid = async (id: number) => {
    try {
      await apiCenter.post(`/invoices/${id}/mark-paid`, {});
      message.success("Marcada como pagada");
      fetchAll();
    } catch (e) {
      console.error(e);
      message.error("No se pudo marcar pagada");
    }
  };

  const openAdjust = (id: number) => {
    setAdjustId(id);
    form.resetFields();
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    try {
      const v = await form.validateFields();
      await apiCenter.post(`/invoices/${adjustId}/adjust`, v);
      message.success("Ajuste aplicado");
      setAdjustOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
      message.error("No se pudo ajustar");
    }
  };

  const columns: ColumnsType<Invoice> = [
    { title: "ID", dataIndex: "id", key: "id", width: 70 },
    {
      title: "Restaurante",
      dataIndex: "restaurantId",
      key: "restaurantId",
      render: (id) => id,
      width: 120,
    },
    {
      title: "Base",
      dataIndex: "amountBaseCents",
      key: "amountBaseCents",
      render: (v, r) => `$${(v / 100).toFixed(2)} ${r.currency}`,
    },
    {
      title: "Descuento",
      dataIndex: "discountCents",
      key: "discountCents",
      render: (v) => `-$${(v / 100).toFixed(2)}`,
    },
    {
      title: "Ajustes",
      dataIndex: "adjustmentsCents",
      key: "adjustmentsCents",
      render: (v) => `$${(v / 100).toFixed(2)}`,
    },
    {
      title: "Total",
      dataIndex: "amountDueCents",
      key: "amountDueCents",
      render: (v, r) => (
        <b>
          ${(v / 100).toFixed(2)} {r.currency}
        </b>
      ), // 👈 quité el doble $
    },
    {
      title: "Vence",
      dataIndex: "dueAt",
      key: "dueAt",
      width: 180,
      render: (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
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
      width: 220,
      render: (_, row) => (
        <Space>
          {row.status !== "paid" && (
            <Button size="small" onClick={() => markPaid(row.id)}>
              Marcar pagada
            </Button>
          )}
          <Button size="small" onClick={() => openAdjust(row.id)}>
            Ajuste/Desc.
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Facturas">
      <Space style={{ marginBottom: 12 }}>
        <Select<InvoiceStatus>
          allowClear
          placeholder="Filtrar status"
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: "pending", label: "pending" },
            { value: "paid", label: "paid" },
            { value: "past_due", label: "past_due" },
            { value: "void", label: "void" },
          ]}
          style={{ width: 180 }}
        />
        <Select<number>
          allowClear
          placeholder="Restaurante"
          value={restaurantId}
          onChange={(v) => setRestaurantId(v)}
          showSearch
          optionFilterProp="label"
          options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
          style={{ width: 260 }}
        />
        <Button onClick={fetchAll}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
      />

      <Modal
        title="Ajuste / Descuento"
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={submitAdjust}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="discountCents" label="Descuento one-off (centavos)">
            <InputNumber min={0} step={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="adjustmentCents"
            label="Ajuste (cargo + / abono -) centavos"
          >
            <InputNumber step={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  Space,
  Table,
  Tag,
  message,
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import { useCash } from "../../context/CashKioskContext";

type Method = { id: number; code: string; name: string; isCash?: boolean };

type PendingOrder = {
  orderId: number;
  tableName?: string | null;
  waiterId: number;
  waiterFullName: string;
  tipCollectedTotal: number;
  tipPaidTotal: number;
  tipPending: number;
};

type PendingResponse = {
  orders: PendingOrder[];
  waiters: {
    id: number;
    fullName: string;
    pendingTotal: number;
    orders: number;
  }[];
};

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function TipPayoutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { shiftId } = useCash();
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [waiters, setWaiters] = useState<PendingResponse["waiters"]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<number | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm<{ paymentMethodId?: number }>();

  const sid = useMemo(
    () => Number(sessionStorage.getItem("cash_shift_id") || shiftId || 0),
    [shiftId]
  );

  // Carga métodos y pendientes
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const pm = await apiCashKiosk.get("/payment-methods", {
          validateStatus: () => true,
        });
        setMethods(
          (pm?.data || []).map((m: any) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            isCash: !!m.isCash,
          }))
        );

        const r = await apiCashKiosk.get<PendingResponse>(
          `/tips/pending?shiftId=${sid}`,
          {
            validateStatus: () => true,
          }
        );
        const payload = r?.data || { orders: [], waiters: [] };
        setOrders(payload.orders || []);
        setWaiters(payload.waiters || []);
        setSelectedWaiterId(null);
        setSelectedRowKeys([]);
      } catch (e) {
        message.error("No se pudo cargar propinas pendientes");
        setOrders([]);
        setWaiters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  // Filtro por mesero
  const filtered = useMemo(() => {
    if (!selectedWaiterId) return orders;
    return orders.filter((o) => o.waiterId === selectedWaiterId);
  }, [orders, selectedWaiterId]);

  const columns: ColumnsType<PendingOrder> = [
    {
      title: "Orden",
      dataIndex: "orderId",
      key: "orderId",
      render: (v, r) => (
        <>
          #{v} {r.tableName ? `· ${r.tableName}` : ""}
        </>
      ),
      width: 140,
    },
    {
      title: "Mesero",
      dataIndex: "waiterFullName",
      key: "waiterFullName",
      render: (v) => <Tag color="blue">{v}</Tag>,
      width: 220,
    },
    {
      title: "Cobrada",
      dataIndex: "tipCollectedTotal",
      key: "tipCollectedTotal",
      align: "right",
      render: (v) => money(Number(v || 0)),
      width: 120,
    },
    {
      title: "Pagado",
      dataIndex: "tipPaidTotal",
      key: "tipPaidTotal",
      align: "right",
      render: (v) => money(Number(v || 0)),
      width: 120,
    },
    {
      title: "Pendiente",
      dataIndex: "tipPending",
      key: "tipPending",
      align: "right",
      render: (v) => <b>{money(Number(v || 0))}</b>,
      width: 140,
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 140,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          onClick={() => payOne(row)}
          disabled={loading}
        >
          Pagar
        </Button>
      ),
    },
  ];

  const payOne = async (row: PendingOrder) => {
    if (!sid) return message.error("No hay turno activo");
    const methodId = form.getFieldValue("paymentMethodId");
    if (!methodId) return message.warning("Selecciona el método de pago");
    try {
      setLoading(true);
      await apiCashKiosk.post(
        "/tips/payouts",
        {
          shiftId: sid,
          waiterId: row.waiterId,
          paymentMethodId: Number(methodId),
          orderId: row.orderId,
          amount: Number(row.tipPending || 0),
          notes: `Payout automático orden #${row.orderId}`,
        },
        { validateStatus: () => true }
      );
      message.success(`Propina de orden #${row.orderId} pagada`);
      // refrescar lista
      const r = await apiCashKiosk.get<PendingResponse>(
        `/tips/pending?shiftId=${sid}`,
        {
          validateStatus: () => true,
        }
      );
      const payload = r?.data || { orders: [], waiters: [] };
      setOrders(payload.orders || []);
      setWaiters(payload.waiters || []);
      // mantener filtro si sigue existiendo
      setSelectedRowKeys((prev) => prev.filter((k) => k !== row.orderId));
    } catch (e: any) {
      message.error(
        String(e?.response?.data?.error || "No se pudo pagar la propina")
      );
    } finally {
      setLoading(false);
    }
  };

  const paySelected = async () => {
    if (!sid) return message.error("No hay turno activo");
    const methodId = form.getFieldValue("paymentMethodId");
    if (!methodId) return message.warning("Selecciona el método de pago");
    const rows = filtered.filter((o) => selectedRowKeys.includes(o.orderId));
    if (rows.length === 0)
      return message.warning("No hay órdenes seleccionadas");

    try {
      setLoading(true);
      for (const row of rows) {
        await apiCashKiosk.post(
          "/tips/payouts",
          {
            shiftId: sid,
            waiterId: row.waiterId,
            paymentMethodId: Number(methodId),
            orderId: row.orderId,
            amount: Number(row.tipPending || 0),
            notes: `Payout múltiple orden #${row.orderId}`,
          },
          { validateStatus: () => true }
        );
      }
      message.success(`Pagadas ${rows.length} propina(s)`);
      // refrescar
      const r = await apiCashKiosk.get<PendingResponse>(
        `/tips/pending?shiftId=${sid}`,
        {
          validateStatus: () => true,
        }
      );
      const payload = r?.data || { orders: [], waiters: [] };
      setOrders(payload.orders || []);
      setWaiters(payload.waiters || []);
      setSelectedRowKeys([]);
    } catch (e: any) {
      message.error(
        String(e?.response?.data?.error || "No se pudo pagar en lote")
      );
    } finally {
      setLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: PendingOrder) => ({
      disabled: Number(record.tipPending || 0) <= 0.009,
    }),
  };

  const totals = useMemo(() => {
    const base = (selectedWaiterId ? filtered : orders) || [];
    const pending = base.reduce((a, r) => a + Number(r.tipPending || 0), 0);
    return { pending };
  }, [filtered, orders, selectedWaiterId]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Pagar propinas"
      destroyOnClose
      footer={null}
      confirmLoading={loading}
      width={900}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Form form={form} layout="inline">
          <Form.Item label="Mesero">
            <Select
              style={{ minWidth: 260 }}
              allowClear
              placeholder="Todos los meseros"
              value={selectedWaiterId ?? undefined}
              onChange={(v) => setSelectedWaiterId(v ?? null)}
              options={waiters.map((w) => ({
                value: w.id,
                label: `${w.fullName} · ${w.orders} orden(es) · Pendiente ${money(w.pendingTotal)}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="paymentMethodId"
            label="Método de pago al mesero"
            rules={[{ required: true, message: "Selecciona método" }]}
          >
            <Select
              style={{ minWidth: 220 }}
              placeholder="Selecciona"
              options={methods.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={paySelected}
              disabled={selectedRowKeys.length === 0 || loading}
            >
              Pagar seleccionadas
            </Button>
          </Form.Item>
        </Form>

        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Pendiente (vista actual)">
            <b>{money(totals.pending)}</b>
          </Descriptions.Item>
        </Descriptions>

        <Table<PendingOrder>
          rowKey={(r) => r.orderId}
          columns={columns}
          dataSource={filtered}
          loading={loading}
          size="small"
          pagination={{ pageSize: 8 }}
          rowSelection={rowSelection}
        />
      </Space>
    </Modal>
  );
}

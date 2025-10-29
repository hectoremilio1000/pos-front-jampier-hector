import { Card, Descriptions, Empty, Space, Table, Button, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import PayModal from "./modals/PayModal";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";
import type { CashOrderItem } from "../hooks/useCashKiosk";

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function OrderDetail() {
  const { selectedOrder } = useCash();
  const [open, setOpen] = useState(false);

  const items = selectedOrder?.items ?? [];

  const columns: ColumnsType<CashOrderItem> = [
    {
      title: "Producto",
      dataIndex: "name",
      key: "name",
      render: (_, it) => it.name ?? `#${it.id}`,
    },
    { title: "Cant.", dataIndex: "qty", key: "qty", align: "right", width: 80 },
    {
      title: "P. Unit.",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (v) => `$${Number(v ?? 0).toFixed(2)}`,
      width: 120,
    },
    {
      title: "Importe",
      key: "importe",
      align: "right",
      render: (_, it) => {
        const unit = Number(it.unitPrice ?? 0);
        const disc = Number((it as any).discountValue ?? 0);
        return money(unit - disc);
      },
      width: 120,
    },
    {
      title: "Total",
      key: "total",
      align: "right",
      render: (_, it) =>
        `$${Number(it.total ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)).toFixed(2)}`,
      width: 120,
    },
  ];

  const { baseSubtotal, taxTotal, grandTotal } = useMemo(() => {
    let base = 0,
      tax = 0,
      total = 0;
    for (const it of items) {
      const qty = Number(it.qty ?? 0);
      const basePrice = Number((it as any).basePrice ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      base += basePrice * qty;
      tax += (unitPrice - basePrice) * qty;
      total += unitPrice * qty;
    }
    base = Math.round(base * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    total = Math.round(total * 100) / 100;
    return { baseSubtotal: base, taxTotal: tax, grandTotal: total };
  }, [items]);

  if (!selectedOrder) {
    return (
      <Card>
        <Empty description="Selecciona una orden para ver el detalle" />
      </Card>
    );
  }

  return (
    <Card
      title={`Orden #${selectedOrder.id} · ${selectedOrder.tableName ?? "-"}`}
    >
      <Space direction="vertical" className="w-full">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Área">
            {selectedOrder.area?.name ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Personas">
            {selectedOrder.persons ?? "-"}
          </Descriptions.Item>
        </Descriptions>

        <Table<CashOrderItem>
          rowKey={(r) => r.id}
          columns={columns}
          dataSource={items}
          size="small"
          pagination={false}
        />

        <Divider style={{ margin: "8px 0" }} />

        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="Subtotal (base)">
            {money(baseSubtotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Impuestos">
            {money(taxTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Total">
            {money(grandTotal)}
          </Descriptions.Item>
        </Descriptions>

        <Button type="primary" size="large" onClick={() => setOpen(true)}>
          Cobrar
        </Button>
        <PayModal open={open} onClose={() => setOpen(false)} />
      </Space>
    </Card>
  );
}

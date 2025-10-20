// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/components/OrderDetail.tsx

import { Card, Descriptions, Empty, Space, Table, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import PayModal from "./modals/PayModal";
import { useState } from "react";
import { useCash } from "../context/CashKioskContext";
import type { CashOrderItem } from "../hooks/useCashKiosk";

export default function OrderDetail() {
  const { selectedOrder } = useCash();
  const [open, setOpen] = useState(false);

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
      title: "Total",
      key: "total",
      align: "right",
      render: (_, it) =>
        `$${Number(it.total ?? (it.qty ?? 0) * (it.unitPrice ?? 0)).toFixed(2)}`,
      width: 120,
    },
  ];

  if (!selectedOrder) {
    return (
      <Card>
        <Empty description="Selecciona una orden para ver el detalle" />
      </Card>
    );
  }

  const subtotal = selectedOrder.items.reduce(
    (acc, it) => acc + (it.total ?? it.qty * it.unitPrice),
    0
  );

  return (
    <Card
      title={`Orden #${selectedOrder.id} · ${selectedOrder.tableName ?? "-"}`}
    >
      <Space direction="vertical" className="w-full">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Área">
            {selectedOrder.areaName ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Personas">
            {selectedOrder.persons ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Subtotal">{`$${subtotal.toFixed(2)}`}</Descriptions.Item>
        </Descriptions>
        <Table<CashOrderItem>
          rowKey={(r) => r.id}
          columns={columns}
          dataSource={selectedOrder.items}
          size="small"
          pagination={false}
        />
        <Button type="primary" size="large" onClick={() => setOpen(true)}>
          Cobrar
        </Button>
        <PayModal open={open} onClose={() => setOpen(false)} />
      </Space>
    </Card>
  );
}

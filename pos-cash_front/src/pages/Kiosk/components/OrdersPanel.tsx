// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/components/OrdersPanel.tsx

import { Card, Empty, Input, List, Segmented, Space, Typography } from "antd";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";

const { Text } = Typography;

export default function OrdersPanel() {
  const { orders, selectedOrderId, fetchOrders, fetchOrderById } = useCash();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const areas = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) {
      const key = o?.area?.name || "–";
      m.set(key, key);
    }
    return Array.from(m.keys()).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    return orders
      .filter((o) =>
        areaFilter === "all" ? true : (o?.area?.name || "–") === areaFilter
      )
      .filter((o) => {
        if (!q.trim()) return true;
        const term = q.trim().toLowerCase();
        return (
          (o.tableName || "").toLowerCase().includes(term) ||
          String(o.id).includes(term)
        );
      });
  }, [orders, areaFilter, q]);

  if (orders.length === 0) {
    return (
      <Card>
        <Space className="w-full" direction="vertical">
          <div className="flex justify-between items-center">
            <Input.Search
              placeholder="Buscar mesa / folio"
              allowClear
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={fetchOrders}
              style={{ maxWidth: 260 }}
            />
          </div>
          <Empty description="Sin órdenes pendientes de cobro" />
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space className="w-full" direction="vertical">
        <div className="flex justify-between gap-3 flex-wrap">
          <Input.Search
            placeholder="Buscar mesa / folio"
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={fetchOrders}
            style={{ maxWidth: 260 }}
          />
          <Segmented
            options={[
              { label: "Todas", value: "all" },
              ...areas.map((a) => ({ label: a, value: a })),
            ]}
            value={areaFilter}
            onChange={(v) => setAreaFilter(String(v))}
          />
        </div>

        <List
          bordered
          dataSource={filtered}
          locale={{ emptyText: "Sin órdenes pendientes de cobro" }}
          renderItem={(o) => {
            const label = o.tableName?.trim() || `Orden #${o.id}`;
            const selected = selectedOrderId === o.id;
            return (
              <List.Item
                key={o.id}
                onClick={() => fetchOrderById(o.id)}
                className={
                  selected
                    ? "cursor-pointer bg-blue-50 border border-blue-400"
                    : "cursor-pointer"
                }
              >
                <Text strong={selected}>{label}</Text>
              </List.Item>
            );
          }}
        />
      </Space>
    </Card>
  );
}

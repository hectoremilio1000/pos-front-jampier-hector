// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/components/OrdersPanel.tsx

import { Badge, Button, Card, Empty, Input, Segmented, Space } from "antd";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";

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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((o) => (
            <Card
              key={o.id}
              hoverable
              onClick={() => fetchOrderById(o.id)}
              size="small"
              title={`Orden #${o.id} · ${o.tableName ?? "-"}`}
              className={
                selectedOrderId === o.id
                  ? "border-blue-500 ring-2 ring-blue-400"
                  : ""
              }
            >
              <div className="flex justify-between">
                <div className="text-xs text-gray-600">
                  Área: {o.area.name ?? "-"}
                </div>
                <Badge count={o.persons ?? 0} title="Personas" />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Ítems: {o.items?.length ?? 0}
              </div>
              <Button
                className="mt-2"
                type="primary"
                block
                onClick={(e) => {
                  e.stopPropagation();
                  fetchOrderById(o.id);
                }}
              >
                Ver detalle / Cobrar
              </Button>
            </Card>
          ))}
        </div>
      </Space>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import apiOrder from "@/components/apis/apiOrder";
import apiCash from "@/components/apis/apiCash";

export type Kpi = {
  label: string;
  value: number | string;
  delta?: number;
  icon?: string;
  color?: "green" | "red" | "yellow" | "default";
};

type ShiftDTO = {
  id: number;
  cashierName?: string;
  openingCash?: number;
  expectedCash?: number;
  difference?: number;
};

type TableDTO = {
  id: number;
  code: string;
  areaId: number | null;
  status: "open" | "closed";
  openedAt?: string;
};

type AreaDTO = { id: number; name: string };

type OrderItem = {
  productId: number;
  qty: number;
  price: number;
  printArea?: "kitchen" | "bar" | "expo";
};

type OrderDTO = {
  id: number;
  status: "open" | "preparing" | "closed";
  createdAt: string;
  closedAt?: string | null;
  amountTotal?: number;
  tipAmount?: number;
  items?: OrderItem[];
};

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function useDashboardData(restaurantId?: number) {
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [shift, setShift] = useState<ShiftDTO | null>(null);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);

  const [topProducts, setTopProducts] = useState<
    { name: string; qty: number; amount: number }[]
  >([]);
  const [categories, setCategories] = useState<
    { name: string; amount: number }[]
  >([]);
  const [hourly, setHourly] = useState<{ hour: string; amount: number }[]>([]);
  const [alerts, setAlerts] = useState<
    { type: "danger" | "warning" | "info"; text: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [shiftRes, tablesRes, areasRes, ordersRes] = await Promise.all([
          apiCash
            .get<ShiftDTO>("/shifts/current")
            .then((r) => r.data)
            .catch(() => null),
          apiOrder
            .get<TableDTO[]>("/tables")
            .then((r) => r.data)
            .catch(() => []),
          apiOrder
            .get<AreaDTO[]>("/areas")
            .then((r) => r.data)
            .catch(() => []),
          apiOrder
            .get<OrderDTO[]>("/orders")
            .then((r) => r.data)
            .catch(() => []),
        ]);

        setShift(shiftRes);
        setTables(tablesRes);
        setAreas(areasRes);
        setOrders(ordersRes);

        // 1) KPIs (derivados de orders cerradas hoy)
        const closedToday = ordersRes.filter(
          (o) => o.status === "closed" && isToday(o.closedAt || o.createdAt)
        );
        const salesTotal = closedToday.reduce(
          (s, o) => s + (o.amountTotal ?? 0),
          0
        );
        const tickets = closedToday.length;
        const avgTicket = tickets ? salesTotal / tickets : 0;
        const tipsPct = (() => {
          const tips = closedToday.reduce((s, o) => s + (o.tipAmount ?? 0), 0);
          const bases = closedToday.reduce(
            (s, o) => s + ((o.amountTotal ?? 0) - (o.tipAmount ?? 0)),
            0
          );
          return bases > 0 ? (tips / bases) * 100 : 0;
        })();

        setKpis([
          {
            label: "Ventas de hoy",
            value: Math.round(salesTotal),
            icon: "💵",
            color: "default",
          },
          {
            label: "Tickets/Mesas",
            value: tickets,
            icon: "🍽️",
            color: "default",
          },
          {
            label: "Ticket promedio",
            value: Math.round(avgTicket),
            icon: "📊",
            color: "default",
          },
          {
            label: "Propina %",
            value: `${tipsPct.toFixed(1)}%`,
            icon: "💸",
            color: "default",
          },
        ]);

        // 2) Top productos (si /orders incluye items)
        const prodMap = new Map<
          number,
          { name: string; qty: number; amount: number }
        >();
        for (const o of closedToday) {
          for (const it of o.items || []) {
            const cur = prodMap.get(it.productId) || {
              name: `#${it.productId}`,
              qty: 0,
              amount: 0,
            };
            cur.qty += it.qty;
            cur.amount += it.price * it.qty;
            prodMap.set(it.productId, cur);
          }
        }
        setTopProducts(
          Array.from(prodMap.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        );

        // 3) Categorías (si no hay join lo dejamos vacío)
        setCategories([]);

        // 4) Horas pico
        const byHour: Record<string, number> = {};
        for (const o of closedToday) {
          const d = new Date(o.closedAt || o.createdAt);
          const hh = String(d.getHours()).padStart(2, "0");
          byHour[hh] = (byHour[hh] || 0) + (o.amountTotal ?? 0);
        }
        setHourly(
          Object.entries(byHour)
            .sort()
            .map(([hour, amount]) => ({ hour, amount }))
        );

        // 5) Alertas
        const alertsAgg: {
          type: "danger" | "warning" | "info";
          text: string;
        }[] = [];
        // Mesas > 3h sin cobrar
        const threeHoursMs = 3 * 60 * 60 * 1000;
        const openTables = tablesRes.filter((t) => t.status === "open");
        const overdue = openTables.filter(
          (t) =>
            t.openedAt &&
            Date.now() - new Date(t.openedAt).getTime() > threeHoursMs
        );
        if (overdue.length)
          alertsAgg.push({
            type: "warning",
            text: `${overdue.length} mesa(s) > 3h`,
          });

        // Diferencia caja
        if (
          shiftRes &&
          typeof shiftRes.difference === "number" &&
          shiftRes.difference !== 0
        ) {
          const sign = shiftRes.difference > 0 ? "+" : "";
          alertsAgg.push({
            type: "warning",
            text: `Caja con diferencia provisional ${sign}$${Math.round(
              shiftRes.difference
            ).toLocaleString()}`,
          });
        }

        setAlerts(alertsAgg);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  // Estado operativo derivado
  const state = useMemo(() => {
    const cashOpen = shift
      ? {
          count: 1,
          items: [
            {
              cashier: shift.cashierName || "Cajero",
              balance: shift.expectedCash ?? 0,
            },
          ],
        }
      : { count: 0, items: [] as { cashier: string; balance: number }[] };

    const areasById = new Map(areas.map((a) => [a.id, a.name]));
    const open = tables.filter((t) => t.status === "open");
    const byAreaMap = new Map<string, number>();
    for (const t of open) {
      const name = areasById.get(t.areaId || -1) || "Sin área";
      byAreaMap.set(name, (byAreaMap.get(name) || 0) + 1);
    }
    const tablesAgg = {
      total: open.length,
      byArea: Array.from(byAreaMap, ([name, count]) => ({ name, count })),
    };

    let kitchen = 0,
      bar = 0,
      expo = 0;
    for (const o of orders) {
      if (o.status === "closed") continue;
      const dests = new Set(
        (o.items || []).map((it) => it.printArea).filter(Boolean)
      );
      if (dests.has("kitchen")) kitchen++;
      if (dests.has("bar")) bar++;
      if (dests.has("expo")) expo++;
    }
    const ordersAgg = { kitchen, bar, expo };

    // placeholder staff hasta que tengas asistencia real
    const staff = { waiters: 0, cashiers: cashOpen.count, bartenders: 0 };

    return { cashOpen, tables: tablesAgg, orders: ordersAgg, staff };
  }, [shift, tables, areas, orders]);

  return { loading, kpis, state, topProducts, categories, hourly, alerts };
}

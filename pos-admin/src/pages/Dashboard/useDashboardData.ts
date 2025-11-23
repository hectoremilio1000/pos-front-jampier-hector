import { useEffect, useMemo, useState } from "react";
import apiOrder from "@/components/apis/apiOrder";
import apiCash from "@/components/apis/apiCash";
import apiOrderAuth from "@/components/apis/apiOrderAuth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useAuth } from "@/components/Auth/AuthContext";

dayjs.extend(utc);
export type Kpi = {
  label: string;
  value: number | string;
  delta?: number;
  icon?: string;
  color?: "green" | "red" | "yellow" | "default";
};

type Station = {
  id: number;
  name: string;
  mode: string;
};
type Session = {
  id: number;
  openingCash?: number;
  expectedCash?: number;
  difference?: number;
  status: string;
  station: Station;
};
type ShiftDTO = {
  id: number;
  userId: number;
  sessions: Session[];
};

type TableDTO = {
  id: number;
  code: string;
  areaId: number | null;
  status: "open" | "closed";
  openedAt?: string;
};

type AreaDTO = { id: number; name: string };

type AreaImpresion = {
  name: string;
};
type Category = {
  id: number;
  name: string;
};
type Group = {
  id: number;
  name: string;
  category: Category;
};
type Product = {
  id: number;
  name: string;
  group: Group;
};
type OrderItem = {
  productId: number;
  qty: number;
  unitPrice: number;
  total: number;
  routeAreaId?: number;
  areaImpresion?: AreaImpresion;
  product?: Product;
};

type OrderDTO = {
  id: number;
  status: "open" | "preparing" | "closed";
  createdAt: string;
  closedAt?: string | null;
  openedAt: string;
  total?: number;
  tipCollectedTotal?: number;
  waiterId: number;
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
  const { user } = useAuth();

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [shift, setShift] = useState<ShiftDTO | null>(null);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [ordersCancel, setOrdersCancel] = useState<OrderDTO[]>([]);

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
  type CategoryStat = { name: string; amount: number };
  function getTopCategories(
    orders: OrderDTO[], // o tu tipo Order[]
    limit = 5,
    mode: "amount" | "qty" = "amount"
  ): CategoryStat[] {
    const totalsByCategory = new Map<string, number>();

    for (const order of orders || []) {
      for (const item of order.items || []) {
        const categoryName = item.product?.group?.category?.name;
        if (!categoryName) continue;

        let value = 0;

        if (mode === "amount") {
          // $$$ – suma de dinero
          value = Number(item.total || 0);
        } else {
          // "qty" – cantidad de piezas
          value = Number(item.qty || 0);
        }

        totalsByCategory.set(
          categoryName,
          (totalsByCategory.get(categoryName) || 0) + value
        );
      }
    }

    // ordenar de mayor a menor y tomar top N
    const sortedEntries = Array.from(totalsByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // convertir a { name, amount }
    return sortedEntries.map(([name, amount]) => ({ name, amount }));
  }
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [shiftRes, tablesRes, areasRes, ordersRes, ordersCancelRes] =
          await Promise.all([
            apiCash
              .get<ShiftDTO>(
                `/admin/shifts/current?restaurantId=${user?.restaurant?.id}`
              )
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
            apiOrderAuth
              .get<OrderDTO[]>("/admin/orders")
              .then((r) => {
                return r.data;
              })
              .catch(() => []),
            apiOrderAuth
              .get<OrderDTO[]>("/admin/orders/cancel")
              .then((r) => {
                return r.data;
              })
              .catch(() => []),
          ]);

        setShift(shiftRes);
        setTables(tablesRes);
        setAreas(areasRes);
        setOrders(ordersRes);
        setOrdersCancel(ordersCancelRes);

        // 1) KPIs (derivados de orders cerradas hoy)
        const closedToday = ordersRes.filter((o) => {
          const openedAt = dayjs(o.openedAt)
            .local()
            .format("YYYY-MM-DD HH:mm:ss");

          return o.status === "closed" && isToday(openedAt);
        });
        const salesTotal = closedToday.reduce(
          (s, o) => s + (Number(o.total) ?? 0),
          0
        );
        const tickets = closedToday.length;
        const avgTicket = tickets ? salesTotal / tickets : 0;
        const tipsPct = (() => {
          const tips = closedToday.reduce(
            (s, o) => s + (o.tipCollectedTotal ?? 0),
            0
          );
          const bases = closedToday.reduce((s, o) => s + (o.total ?? 0), 0);
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
              name: `#${it.product?.name}`,
              qty: 0,
              amount: 0,
            };
            cur.qty += it.qty;
            cur.amount += it.unitPrice * it.qty;
            prodMap.set(it.productId, cur);
          }
        }
        setTopProducts(
          Array.from(prodMap.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        );

        // 3) Categorías (si no hay join lo dejamos vacío)
        const topCategories = getTopCategories(ordersRes, 5, "amount");
        console.log(topCategories);
        setCategories(topCategories);

        // 4) Horas pico
        const byHour: Record<string, number> = {};
        for (const o of closedToday) {
          const d = new Date(o.closedAt || o.createdAt);
          console.log(d);
          const hh = String(d.getHours()).padStart(2, "0");
          console.log(hh);
          byHour[hh] = o.total ?? 0;
        }
        setHourly(
          Object.entries(byHour)
            .sort()
            .map(([hour, amount]) => ({ hour, amount }))
        );
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
          sessions: shift.sessions,
        }
      : { count: 0, sessions: [] };

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
    // meseros
    const waiterIds = new Set<number>();

    for (const o of orders) {
      if (o.waiterId != null) {
        waiterIds.add(o.waiterId);
      }
    }

    // placeholder staff hasta que tengas asistencia real
    const staff = {
      waiters: waiterIds.size,
      cashiers: cashOpen.sessions?.length,
      bartenders: 0,
    };

    return { cashOpen, tables: tablesAgg, staff, ordersCancel };
  }, [shift, tables, areas, orders]);

  return { loading, kpis, state, topProducts, categories, hourly, alerts };
}

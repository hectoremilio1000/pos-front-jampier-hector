import { useEffect, useMemo, useRef, useState } from "react";
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

type ClosedSummary = {
  salesTotal: number;
  tickets: number;
  avgTicket: number;
  tipsPct: number;
};

type DashboardKpisResponse = {
  salesNet: number;
  openSales: number;
  cancelledItems?: { qty: number; amount: number };
  cancelledOrders?: number;
  updatedAt?: string;
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
  isModifier?: boolean | null;
  routeAreaId?: number;
  areaImpresion?: AreaImpresion;
  product?: Product;
};
export type OrderDTO = {
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

const REALTIME_REFRESH_MS = 30000;

export function useDashboardData(restaurantId?: number) {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [shift, setShift] = useState<ShiftDTO | null>(null);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState(0);
  const [cancelledItems, setCancelledItems] = useState({ qty: 0, amount: 0 });
  const [fiscalCutHour, setFiscalCutHour] = useState("05:00");

  const closedSummaryRef = useRef<ClosedSummary>({
    salesTotal: 0,
    tickets: 0,
    avgTicket: 0,
    tipsPct: 0,
  });

  const [topProducts, setTopProducts] = useState<
    { name: string; qty: number; amount: number }[]
  >([]);
  const [categories, setCategories] = useState<
    { name: string; amount: number }[]
  >([]);
  const [hourly, setHourly] = useState<{ hour: string; amount: number }[]>([]);

  type CategoryStat = { name: string; amount: number };
  function getTopCategories(
    orders: OrderDTO[], // o tu tipo Order[]
    limit = 5,
    mode: "amount" | "qty" = "amount"
  ): CategoryStat[] {
    const totalsByCategory = new Map<string, number>();

    for (const order of orders || []) {
      for (const item of order.items || []) {
        if (item.isModifier) continue;
        const categoryName = item.product?.group?.category?.name;
        if (!categoryName) continue;

        let value = 0;

        if (mode === "amount") {
          // $$$ – suma de dinero
          const lineTotal =
            item.total != null ? Number(item.total) : Number(item.unitPrice) * Number(item.qty);
          value = Number.isFinite(lineTotal) ? lineTotal : 0;
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
  function businessDayRange(fiscalCutHour: string) {
    const [hRaw, mRaw] = fiscalCutHour.split(":");
    const h = Number(hRaw || 0);
    const m = Number(mRaw || 0);
    const now = dayjs();
    let start = now.hour(h).minute(m).second(0).millisecond(0);
    if (now.isBefore(start)) start = start.subtract(1, "day");
    const end = start.add(1, "day").subtract(1, "second");
    return { start, end };
  }

  function buildKpis(
    summary: ClosedSummary,
    realtime?: DashboardKpisResponse | null
  ): Kpi[] {
    const salesNet = Number(realtime?.salesNet ?? summary.salesTotal ?? 0);
    const openSales = Number(realtime?.openSales ?? 0);
    const realtimeSales = salesNet + openSales;

    return [
      {
        label: "Ventas cerradas",
        value: Math.round(salesNet),
        icon: "💵",
        color: "default",
      },
      {
        label: "Ventas abiertas",
        value: Math.round(openSales),
        icon: "🟢",
        color: "default",
      },
      {
        label: "Ventas en tiempo real",
        value: Math.round(realtimeSales),
        icon: "⚡",
        color: "default",
      },
      {
        label: "Tickets/Mesas",
        value: summary.tickets,
        icon: "🍽️",
        color: "default",
      },
      {
        label: "Ticket promedio",
        value: Math.round(summary.avgTicket),
        icon: "📊",
        color: "default",
      },
      {
        label: "Propina %",
        value: `${summary.tipsPct.toFixed(1)}%`,
        icon: "💸",
        color: "default",
      },
    ];
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rid = restaurantId ?? user?.restaurant?.id;
        if (!rid) {
          setLoading(false);
          return;
        }

        const [shiftRes, settingsRes, tablesRes, areasRes] = await Promise.all(
          [
            apiCash
              .get<ShiftDTO>(`/admin/shifts/current?restaurantId=${rid}`)
              .then((r) => r.data)
              .catch(() => null),
            apiCash
              .get<{ fiscalCutHour?: string }>(`/settings/${rid}`)
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
          ]
        );

        const cutHour = settingsRes?.fiscalCutHour ?? "05:00";
        setFiscalCutHour(cutHour);
        const { start, end } = businessDayRange(cutHour);
        const dateStart = start.toISOString();
        const dateEnd = end.toISOString();

        const [ordersData, ordersCurrent, dashboardKpis] = await Promise.all([
          apiOrderAuth
            .get<OrderDTO[]>("/admin/orders", {
              params: {
                dateStart,
                dateEnd,
                statuses: "paid,settled,closed",
              },
            })
            .then((r) => r.data)
            .catch(() => []),
          apiOrderAuth
            .get<OrderDTO[]>("/admin/orders/consult", {
              params: {
                mode: "current",
                status: "all",
              },
            })
            .then((r) => r.data)
            .catch(() => []),
          apiOrderAuth
            .get<DashboardKpisResponse>("/admin/dashboard/kpis", {
              params: { dateStart, dateEnd },
            })
            .then((r) => r.data)
            .catch(() => null),
        ]);

        setShift(shiftRes);
        setTables(tablesRes);
        setAreas(areasRes);
        setOrders(ordersCurrent);
        setCancelledItems(
          dashboardKpis?.cancelledItems ?? { qty: 0, amount: 0 }
        );
        setCancelledOrders(Number(dashboardKpis?.cancelledOrders ?? 0));

        // 1) KPIs (derivados de orders cerradas hoy)
        const closedToday = ordersData.filter((o) =>
          ["paid", "settled", "closed"].includes(String(o.status || ""))
        );
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

        const summary: ClosedSummary = {
          salesTotal,
          tickets,
          avgTicket,
          tipsPct,
        };
        closedSummaryRef.current = summary;
        setKpis(buildKpis(summary, dashboardKpis));

        // 2) Top productos (si /orders incluye items)
        const prodMap = new Map<
          number,
          { name: string; qty: number; amount: number }
        >();
        for (const o of closedToday) {
          for (const it of o.items || []) {
            if (it.isModifier) continue;
            const cur = prodMap.get(it.productId) || {
              name: it.product?.name || `#${it.productId}`,
              qty: 0,
              amount: 0,
            };
            cur.qty += it.qty;
            cur.amount += (it.total ?? it.unitPrice * it.qty) || 0;
            prodMap.set(it.productId, cur);
          }
        }
        setTopProducts(
          Array.from(prodMap.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        );

        // 3) Categorías (si no hay join lo dejamos vacío)
        const topCategories = getTopCategories(closedToday, 5, "amount");
        setCategories(topCategories);

        // 4) Horas pico
        const byHour: Record<string, number> = {};
        for (const o of closedToday) {
          if (!o.closedAt) continue;
          const d = new Date(o.closedAt);
          const hh = String(d.getHours()).padStart(2, "0");
          byHour[hh] = (byHour[hh] || 0) + (o.total ?? 0);
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
  }, [restaurantId, user?.restaurant?.id]);

  useEffect(() => {
    const rid = restaurantId ?? user?.restaurant?.id;
    if (!rid) return;

    let active = true;

    const refreshRealtime = async () => {
      try {
        const { start, end } = businessDayRange(fiscalCutHour);
        const dateStart = start.toISOString();
        const dateEnd = end.toISOString();

        const dashboardKpis = await apiOrderAuth
          .get<DashboardKpisResponse>("/admin/dashboard/kpis", {
            params: { dateStart, dateEnd },
          })
          .then((r) => r.data)
          .catch(() => null);

        if (!active) return;

        setCancelledItems(
          dashboardKpis?.cancelledItems ?? { qty: 0, amount: 0 }
        );
        setCancelledOrders(Number(dashboardKpis?.cancelledOrders ?? 0));
        setKpis(buildKpis(closedSummaryRef.current, dashboardKpis));
      } catch {
        // dejamos el último estado
      }
    };

    refreshRealtime();
    const intervalId = setInterval(refreshRealtime, REALTIME_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [restaurantId, user?.restaurant?.id, fiscalCutHour]);

  // Estado operativo derivado
  const state = useMemo(() => {
    const openSessions = shift?.sessions?.filter((s) => s.status === "OPEN") ?? [];
    const cashOpen = shift
      ? {
          count: openSessions.length,
          sessions: openSessions,
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

    const inactiveStatuses = new Set(["closed", "void", "settled", "refunded", "partial_refund"]);
    for (const o of orders) {
      const st = String(o.status || "").toLowerCase();
      if (inactiveStatuses.has(st)) continue;
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

    return { cashOpen, tables: tablesAgg, staff, cancelledOrders, cancelledItems };
  }, [shift, tables, areas, orders, cancelledOrders, cancelledItems]);

  return { loading, kpis, state, topProducts, categories, hourly };
}

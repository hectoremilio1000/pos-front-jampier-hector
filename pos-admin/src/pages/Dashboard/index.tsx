import KpiCard from "./components/KpiCard";
import StatePanel from "./components/StatePanel";
import TopProducts from "./components/TopProducts";
import CategoryBars from "./components/CategoryBars";
import HourlySparkline from "./components/HourlySparkline";
import AlertsList from "./components/AlertsList";
import QuickActions from "./components/QuickActions";
import { useDashboardData } from "./useDashboardData";
import { useAuth } from "@/components/Auth/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id;
  const { loading, kpis, state, topProducts, categories, hourly, alerts } =
    useDashboardData(restaurantId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            icon={k.icon}
            label={k.label}
            value={k.value}
            delta={k.delta}
            tone={k.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatePanel {...state} />
        <div className="grid grid-cols-1 gap-4">
          <TopProducts rows={topProducts} />
          <CategoryBars rows={categories} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HourlySparkline points={hourly} />
        <AlertsList rows={alerts} />
        <QuickActions />
      </div>

      {loading && <div className="text-sm text-gray-500">Cargando…</div>}
    </div>
  );
}

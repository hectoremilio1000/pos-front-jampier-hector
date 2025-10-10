// /pos-admin/src/components/Billing/PlanSwitcher.tsx
import { useEffect, useState } from "react";
import { Button, Card, Tag, message } from "antd";
import apiCenter from "@/components/apis/apiCenter";

type PlanPrice = {
  id: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number;
  currency: string;
  isDefault: boolean;
};
type Plan = {
  id: number;
  name: string;
  description?: string;
  prices: PlanPrice[];
};

function humanize(interval: PlanPrice) {
  const n = interval.intervalCount;
  const u = interval.interval;
  const map: Record<string, [string, string]> = {
    day: ["día", "días"],
    week: ["semana", "semanas"],
    month: ["mes", "meses"],
    year: ["año", "años"],
  };
  const [s, p] = map[u] ?? [u, `${u}s`];
  return n === 1 ? s : `${n} ${p}`;
}

export default function PlanSwitcher({
  currentPlanPriceId,
  onSwitch,
  switching,
}: {
  currentPlanPriceId?: number;
  onSwitch: (args: { planPriceId: number }) => Promise<void>;
  switching?: boolean;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    apiCenter
      .get("/plans")
      .then(({ data }) => setPlans(data))
      .catch(() => message.error("No se pudieron cargar planes"));
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}
    >
      {plans.map((p) => (
        <Card key={p.id} title={p.name} extra={<span>{p.description}</span>}>
          {p.prices.map((pr) => {
            const isCurrent = currentPlanPriceId === pr.id;
            return (
              <div
                key={pr.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div>
                  <Tag>{humanize(pr)}</Tag>{" "}
                  <b>
                    ${Number(pr.amount).toFixed(2)} {pr.currency}
                  </b>{" "}
                  {pr.isDefault ? <Tag color="green">default</Tag> : null}
                  {isCurrent ? <Tag color="blue">actual</Tag> : null}
                </div>
                <Button
                  size="small"
                  type="primary"
                  disabled={isCurrent}
                  loading={switching}
                  onClick={() => onSwitch({ planPriceId: pr.id })}
                >
                  {isCurrent ? "Seleccionado" : "Cambiar"}
                </Button>
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

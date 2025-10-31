import type { Plan } from "@/types/billing";
import { Card, Button, Tag } from "antd";

export default function PlanCards({
  plans,
  onSelect,
}: {
  plans: Plan[];
  onSelect: (plan: Plan) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      {plans.map((p) => {
        const defaultPrice =
          p.prices.find((x) => x.isDefault) ||
          p.prices.find(
            (x) => x.interval === "month" && x.intervalCount === 1
          ) ||
          p.prices[0];

        return (
          <Card
            key={p.id}
            style={{ borderRadius: 14 }}
            headStyle={{ fontWeight: 700 }}
            title={p.name}
            extra={p.badge ? <Tag color="blue">{p.badge}</Tag> : undefined}
          >
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 6 }}>
              ${Number(defaultPrice.amount).toFixed(0)}
              <span style={{ fontSize: 14, fontWeight: 400 }}> / mes</span>
            </div>
            <div style={{ opacity: 0.8, marginBottom: 12 }}>
              {p.description || "Plan para tu operación"}
            </div>

            <Button
              type="primary"
              block
              size="large"
              onClick={() => onSelect(p)}
            >
              Elegir este plan
            </Button>

            {!!p.perks?.length && (
              <ul style={{ paddingLeft: 18, marginTop: 12, color: "#666" }}>
                {p.perks.map((perk, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {perk}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

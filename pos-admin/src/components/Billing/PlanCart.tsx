import { useMemo, useState } from "react";
import { Card, Select, Typography, Button, Divider } from "antd";
import type { Plan, PlanPrice } from "@/types/billing";

const { Text, Title } = Typography;

function findExactMonthly(pl: Plan, n: number): PlanPrice | null {
  return (
    pl.prices.find((x) => x.interval === "month" && x.intervalCount === n) ||
    null
  );
}
function findMonthlyBase(pl: Plan): PlanPrice | null {
  return (
    pl.prices.find((x) => x.interval === "month" && x.intervalCount === 1) ||
    null
  );
}

export default function PlanCart({
  plan,
  onCheckout,
}: {
  plan: Plan;
  onCheckout: (args: { planPriceId: number; months: number }) => void;
}) {
  const [months, setMonths] = useState<number>(1);

  const computed = useMemo(() => {
    const exact = findExactMonthly(plan, months);
    if (exact) {
      return {
        unit: exact.amount,
        total: exact.amount,
        currency: exact.currency,
        priceId: exact.id, // checkout con quantity=1
        note: `${months} mes(es) — precio especial`,
      };
    }
    const base = findMonthlyBase(plan) || plan.prices[0];
    return {
      unit: base.amount,
      total: base.amount * months,
      currency: base.currency,
      priceId: base.id, // checkout con quantity=months
      note: `${months} mes(es) — mensual x ${months}`,
    };
  }, [plan, months]);

  return (
    <Card style={{ borderRadius: 14 }}>
      <Title level={4} style={{ marginTop: 0 }}>
        Resumen de compra
      </Title>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{plan.name}</div>
          <Text type="secondary">{plan.description}</Text>
        </div>
        <div>
          <Select
            value={months}
            onChange={(v) => setMonths(v)}
            style={{ width: "100%" }}
            options={[
              { value: 1, label: "1 mes" },
              { value: 3, label: "3 meses" },
              { value: 6, label: "6 meses" },
              { value: 12, label: "12 meses" },
            ]}
          />
        </div>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
        }}
      >
        <Text>Detalle</Text>
        <Text strong>
          ${Number(computed.unit).toFixed(2)} {computed.currency}
          {computed.note.includes("mensual") ? ` × ${months}` : ""}
        </Text>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text>Total</Text>
        <Title level={3} style={{ margin: 0 }}>
          ${Number(computed.total).toFixed(2)} {computed.currency}
        </Title>
      </div>

      <Button
        type="primary"
        size="large"
        block
        style={{ marginTop: 16 }}
        onClick={() => onCheckout({ planPriceId: computed.priceId, months })}
      >
        Pagar
      </Button>

      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
        {computed.note}
      </div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Button, Card, message, Tag } from "antd";

import apiCenter from "../apis/apiCenter";
import { useParams } from "react-router-dom";

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

export default function ChoosePlanPublic() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const { restaurantId } = useParams();

  useEffect(() => {
    apiCenter
      .get("/plans")
      .then(({ data }) => setPlans(data))
      .catch(() => message.error("No se pudieron cargar planes"));
  }, []);

  const buy = async (price: PlanPrice) => {
    if (!restaurantId) {
      return message.error(
        "No tienes acceso a este link, contacta al administrador",
      );
    }
    try {
      setLoading(true);
      const { data } = await apiCenter.post("/subscriptions/checkout_public", {
        planPriceId: price.id,
        restaurantId: restaurantId,
      });
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      message.error("No se pudo iniciar el pago");
    } finally {
      setLoading(false);
    }
  };

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
          {p.prices.map((pr) => (
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
              </div>
              <Button
                size="small"
                type="primary"
                loading={loading}
                onClick={() => buy(pr)}
              >
                Suscribirme
              </Button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Row, Col, message } from "antd";
import apiCenter from "@/components/apis/apiCenter";
import PlanCards from "@/components/Billing/PlanCards";
import PlanCart from "@/components/Billing/PlanCart";
import { useAuth } from "@/components/Auth/AuthContext";
import type { Plan } from "@/types/billing";

export default function Subscribe() {
  const { user } = useAuth();
  const restaurant = user?.restaurant;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);

  useEffect(() => {
    apiCenter
      .get("/plans")
      .then(({ data }) => setPlans(data || []))
      .catch(() => message.error("No se pudieron cargar planes"));
  }, []);

  const handleCheckout = async ({
    planPriceId,
    months,
  }: {
    planPriceId: number;
    months: number;
  }) => {
    if (!restaurant?.id || !restaurant?.name) {
      return message.error("Faltan datos del restaurante");
    }
    try {
      const { data } = await apiCenter.post("/subscriptions/checkout", {
        planPriceId,
        restaurant: { id: restaurant.id, name: restaurant.name },
        months, // ⬅️ meses seleccionados
      });
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      message.error("No se pudo iniciar el pago");
    }
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={selected ? 14 : 24}>
        <PlanCards plans={plans} onSelect={(p) => setSelected(p)} />
      </Col>
      {selected && (
        <Col xs={24} md={10}>
          <PlanCart plan={selected} onCheckout={handleCheckout} />
        </Col>
      )}
    </Row>
  );
}

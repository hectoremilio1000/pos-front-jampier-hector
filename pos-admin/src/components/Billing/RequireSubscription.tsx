import { Spin, Card } from "antd";
import { useLocation } from "react-router-dom";
import { useSubscription } from "./SubscriptionContext";
import Subscribe from "@/pages/Billing/Suscribe";

// Rutas que deben poder verse sin suscripción (checkout/success/cancel)
const WHITELIST_PATHS = [
  "/checkout/success",
  "/checkout/cancel",
  // agrega aquí rutas públicas internas si las tienes
];

export default function RequireSubscription({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, subscription } = useSubscription();
  const location = useLocation();

  // Permitir páginas whitelisted
  if (WHITELIST_PATHS.some((p) => location.pathname.startsWith(p))) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "60vh" }}>
        <Spin tip="Verificando suscripción..." />
      </div>
    );
  }

  const ok =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing");
  if (!ok) {
    return (
      <Card title="Activa tu suscripción">
        <p>
          No tienes una suscripción activa en este momento. Elige un plan para
          continuar:
        </p>
        <Subscribe />
      </Card>
    );
  }

  return <>{children}</>;
}

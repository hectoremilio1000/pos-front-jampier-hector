import { Alert, Button, Card, Spin, Space } from "antd";
import { useLocation } from "react-router-dom";
import { useSubscription } from "./SubscriptionContext";
import { useAuth } from "@/components/Auth/AuthContext";

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
  const { logout, user } = useAuth();
  const { loading, subscription, error, refresh } = useSubscription();
  const location = useLocation();

  if (user?.role?.code === "superadmin") {
    return <>{children}</>;
  }

  // Permitir páginas whitelisted
  if (WHITELIST_PATHS.some((p) => location.pathname.startsWith(p))) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <Spin tip="Verificando suscripción..." spinning>
        <div style={{ height: "60vh" }} />
      </Spin>
    );
  }

  const ok =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing");
  if (!ok) {
    return (
      <Card title="Suscripción administrada">
        <Space direction="vertical" size={12} style={{ display: "flex" }}>
          <Alert
            type="info"
            showIcon
            message="Tu suscripción la gestiona el equipo de Impulso."
            description="Si necesitas activar, pausar o cambiar plan, contacta al super admin."
          />
          {error ? (
            <Alert
              type="warning"
              showIcon
              message="No se pudo validar la suscripción."
              description="Verifica que el servicio de Centro de Control esté arriba y vuelve a intentar."
            />
          ) : null}
          <div>
            <Space>
              <Button onClick={() => refresh()}>Reintentar</Button>
              <Button onClick={logout}>Cerrar sesión</Button>
            </Space>
          </div>
        </Space>
      </Card>
    );
  }

  return <>{children}</>;
}

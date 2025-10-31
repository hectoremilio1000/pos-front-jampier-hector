import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { message, Spin } from "antd";
import { useSubscription } from "@/components/Billing/SubscriptionContext";
import apiCenter from "@/components/apis/apiCenter";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const { refresh } = useSubscription();

  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // 🔒 evita doble ejecución
    ranRef.current = true;

    const run = async () => {
      if (!sessionId) {
        navigate("/dashboard", { replace: true });
        return;
      }
      try {
        await apiCenter.post("/subscriptions/confirm", { sessionId });
        await refresh(); // 🔄 liberar guard
        message.success("¡Suscripción activada!");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        console.error(e);
        message.error("No se pudo confirmar el pago");
        navigate("/dashboard", { replace: true });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", placeItems: "center", height: "60vh" }}>
      <Spin tip="Confirmando pago..." />
    </div>
  );
}

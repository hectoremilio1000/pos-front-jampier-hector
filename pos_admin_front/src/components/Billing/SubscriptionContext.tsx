import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/Auth/AuthContext";
import apiCenter from "../apis/apiCenter";

type PlanPrice = {
  id: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number;
  currency: string;
  isDefault: boolean;
};

type CurrentSub = {
  id: number;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "expired"
    | "paused";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan?: { id: number; name: string };
  planPrice?: PlanPrice;
};

type SubscriptionContextType = {
  loading: boolean;
  subscription: CurrentSub | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  loading: true,
  subscription: null,
  error: null,
  refresh: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const restaurantId =
    Number(user?.restaurant?.id ?? user?.restaurantId ?? 0) || null;
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<CurrentSub | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrent = async () => {
    if (!restaurantId) {
      setSubscription(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiCenter.get(
        `/subscriptions/current?restaurantId=${restaurantId}`,
      );
      setSubscription(data ?? null);
      setError(null);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[subscriptions/current] error:", err);
      }
      setSubscription(null);
      setError("No se pudo validar la suscripción.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1) Mientras el auth siga cargando, no pedimos nada
    if (authLoading) return;

    // 2) Si todavía no tenemos restaurantId, no asumimos nada de la suscripción.
    //    Dejamos loading en true para que RequireSubscription siga mostrando el spinner.
    if (!restaurantId) {
      setSubscription(null);
      setLoading(true);
      return;
    }

    // 3) Auth listo + restaurantId listo → ahora SÍ consultamos la suscripción
    fetchCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, restaurantId]);

  // combinamos el loading de auth + el loading interno de la suscripción
  const combinedLoading = authLoading || loading;

  const value = useMemo(
    () => ({
      loading: combinedLoading,
      subscription,
      error,
      refresh: fetchCurrent,
    }),
    [combinedLoading, subscription, error],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

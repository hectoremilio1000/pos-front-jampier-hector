// /src/types/billing.ts

export type Plan = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  isActive: boolean;
  defaultPriceId?: number | null;
  prices: PlanPrice[];
};

export type PlanInterval = "day" | "week" | "month" | "year";

export type PlanPrice = {
  id: number;
  planId: number;
  interval: PlanInterval;
  intervalCount: number;
  amount: number;
  currency: string;
  isDefault: boolean;
  stripePriceId?: string | null;
};

// /src/types/billing.ts

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "paused";

// Superset: compatible con tus dos formas actuales
export type SubscriptionRow = {
  id: number;
  restaurantId: number;
  planId: number;
  planPriceId: number | null; // ← clave: permitir null
  status: SubscriptionStatus | string; // ← por si del backend llega string "libre"
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;

  // Opcionales/compat
  paidAt?: string | null;
  stripePaymentId?: string | null;
  priceOverride?: number | null;
  recurringDiscountPercent?: number; // opcional: puede no venir en responses viejas
  recurringDiscount?: number; // opcional

  // anidados (opcionales)
  planPrice?: PlanPrice;
  plan?: { name: string };
  restaurant?: { id: number; name: string };
};

export type PaymentRow = {
  id: number;
  subscriptionId: number | null;
  planPriceId: number | null;
  restaurantId: number;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId?: string | null;
  providerSessionId?: string | null;
  status: "succeeded" | "pending" | "failed" | "refunded";
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

// /pos-admin/src/types/billing.ts
export type PlanPrice = {
  id: number;
  planId: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number; // MXN
  currency: string; // 'MXN'
  isDefault?: boolean;
  stripePriceId?: string | null;
};

export type Plan = {
  id: number;
  name: string;
  description?: string;
  prices: PlanPrice[];
  // opcionales para UI:
  badge?: string | null;
  perks?: string[];
};

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

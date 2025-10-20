import { createContext, useContext, PropsWithChildren } from "react";
import { useCashKiosk } from "../hooks/useCashKiosk";

type CashCtx = ReturnType<typeof useCashKiosk> | null;

const CashKioskCtx = createContext<CashCtx>(null);

export function CashKioskProvider({ children }: PropsWithChildren) {
  const value = useCashKiosk(); // ← un solo estado para toda la pantalla
  return (
    <CashKioskCtx.Provider value={value}>{children}</CashKioskCtx.Provider>
  );
}

export function useCash() {
  const ctx = useContext(CashKioskCtx);
  if (!ctx) throw new Error("useCash must be used within <CashKioskProvider>");
  return ctx;
}

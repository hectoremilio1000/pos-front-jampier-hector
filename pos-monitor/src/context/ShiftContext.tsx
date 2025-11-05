import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
  } from "react";
  
  type ShiftContextValue = {
    shiftId: number | null;
    setShiftId: (id: number | null) => void;
    clearShift: () => void;
  };
  
  const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);
  ShiftContext.displayName = "ShiftContext";
  
  export function ShiftProvider({ children }: { children: ReactNode }) {
    const [shiftId, setShiftIdState] = useState<number | null>(null);
  
    // Carga inicial desde sessionStorage
    useEffect(() => {
      const s = sessionStorage.getItem("cash_shift_id");
      if (s) setShiftIdState(Number(s));
    }, []);
  
    const setShiftId = useCallback((id: number | null) => {
      setShiftIdState(id);
      if (id == null) {
        sessionStorage.removeItem("cash_shift_id");
      } else {
        sessionStorage.setItem("cash_shift_id", String(id));
      }
    }, []);
  
    const clearShift = useCallback(() => setShiftId(null), [setShiftId]);
  
    const value = useMemo<ShiftContextValue>(
      () => ({ shiftId, setShiftId, clearShift }),
      [shiftId, setShiftId, clearShift]
    );
  
    return (
      <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
    );
  }
  
  export function useShift(): ShiftContextValue {
    const ctx = useContext(ShiftContext);
    if (!ctx) {
      throw new Error("useShift debe usarse dentro de <ShiftProvider>");
    }
    return ctx;
  }
  
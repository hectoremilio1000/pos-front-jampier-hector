import { createContext, useContext, useState } from "react";

interface ShiftCtx {
  shiftId: number | null;
  setShiftId: (id: number | null) => void;
}

const ShiftContext = createContext<ShiftCtx>({
  shiftId: null,
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  setShiftId: () => {},
});

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [shiftId, setShiftId] = useState<number | null>(null);
  return (
    <ShiftContext.Provider value={{ shiftId, setShiftId }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => useContext(ShiftContext);

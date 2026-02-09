// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/Numpad.tsx

import { Button } from "antd";

export default function Numpad({
  onDigit,
  onBack,
  onClear,
  disabled,
  big = false,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  onClear?: () => void; // 👈 agregado
  disabled?: boolean;
  big?: boolean;
}) {
  const cellStyle = {
    height: big ? 84 : 68,
    fontSize: big ? 28 : 22,
  } as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <Button
          key={n}
          disabled={disabled}
          onClick={() => onDigit(String(n))}
          style={cellStyle}
        >
          {n}
        </Button>
      ))}
      <Button disabled={disabled} onClick={onClear} style={cellStyle}>
        C
      </Button>
      <Button
        disabled={disabled}
        onClick={() => onDigit("0")}
        style={cellStyle}
      >
        0
      </Button>
      <Button danger disabled={disabled} onClick={onBack} style={cellStyle}>
        ←
      </Button>
    </div>
  );
}

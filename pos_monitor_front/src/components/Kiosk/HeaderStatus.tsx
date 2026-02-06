// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/Kiosk/HeaderStatus.tsx
import { type FC } from "react";

type Props = {
  now: string;
  pairState: "none" | "paired" | "revoked";
  deviceLabel?: string;
};

const HeaderStatus: FC<Props> = ({ now, pairState, deviceLabel }) => {
  const dot =
    pairState === "paired"
      ? "bg-green-500"
      : pairState === "revoked"
        ? "bg-yellow-500"
        : "bg-red-500";
  const text =
    pairState === "paired"
      ? `Emparejado${deviceLabel ? `: ${deviceLabel}` : ""}`
      : pairState === "revoked"
        ? "Revocado"
        : "No emparejado";

  return (
    <div className="text-right text-xs text-gray-500">
      {now}
      <div className="mt-1 flex items-center gap-1 justify-end">
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        <span className="text-nowrap">{text}</span>
      </div>
    </div>
  );
};

export default HeaderStatus;

// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/components/FooterBar.tsx

import { Card, Statistic } from "antd";
import { useCash } from "../context/CashKioskContext";

export default function FooterBar() {
  const { kpis } = useCash();
  return (
    <Card>
      <div className="grid grid-cols-3 gap-4 text-center">
        <Statistic
          title="Efectivo"
          value={kpis.salesCash}
          precision={2}
          prefix="$"
        />
        <Statistic
          title="Tarjeta"
          value={kpis.salesCard}
          precision={2}
          prefix="$"
        />
        <Statistic
          title="Total ventas"
          value={kpis.salesTotal}
          precision={2}
          prefix="$"
        />
      </div>
    </Card>
  );
}

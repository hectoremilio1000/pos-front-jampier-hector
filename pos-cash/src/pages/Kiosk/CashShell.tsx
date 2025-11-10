// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/CashShell.tsx

import { Card, InputNumber, Button, Typography, Space, Spin } from "antd";
import { useEffect, useState } from "react";
import HeaderBar from "./components/HeaderBar";
import ActionStrip from "./components/ActionStrip";
import OrdersPanel from "./components/OrdersPanel";
import OrderDetail from "./components/OrderDetail";
import FooterBar from "./components/FooterBar";
import { CashKioskProvider, useCash } from "./context/CashKioskContext";
import { kioskLogoutOperator, kioskPingOnce } from "@/components/Kiosk/session";
import MovementsModal from "./components/modals/MovementsModal"; // 👈 importa el modal
import CloseShiftModal from "./components/modals/CloseShiftModal";

const { Title, Text } = Typography;

function ShellInner() {
  const [movOpen, setMovOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const {
    loading,
    openingCash,
    setOpeningCash,
    shiftId,
    sessionId,
    openShift,
  } = useCash();

  useEffect(() => {
    const MAX_IDLE_MS = 5 * 60 * 1000; // 5 min
    let t: number | undefined;

    const reset = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        kioskLogoutOperator();
        window.location.replace("/kiosk-login");
      }, MAX_IDLE_MS);
    };

    // eventos de actividad
    const evts: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "touchstart",
    ];
    evts.forEach((e) => window.addEventListener(e, reset));
    reset();

    return () => {
      if (t) window.clearTimeout(t);
      evts.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
  useEffect(() => {
    kioskPingOnce(); // ping inmediato al montar
    const id = window.setInterval(() => {
      kioskPingOnce();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hasShift = !!shiftId;
  const hasSession = !!sessionId;

  if (loading && !hasShift) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 grid grid-rows-[auto_auto_1fr_auto] gap-3 p-3">
      <HeaderBar />
      <ActionStrip
        hasShift={hasShift}
        onOpenMov={() => setMovOpen(true)}
        onOpenClose={() => setCloseOpen(true)}
      />

      {!hasSession ? (
        // puedes cambiar el título a "Abrir caja" si quieres
        <div className="w-full flex items-center justify-center bg-gray-200">
          <Card className="max-w-[500px]">
            <Title level={3} style={{ marginTop: 0 }}>
              Abrir caja
            </Title>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Text>Efectivo inicial</Text>
                <InputNumber
                  prefix="$"
                  min={0}
                  style={{ width: "100%" }}
                  value={openingCash}
                  onChange={(v) => setOpeningCash(Number(v || 0))}
                />
              </div>
              <Button type="primary" block onClick={openShift}>
                Abrir
              </Button>
            </Space>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <OrdersPanel />
          <OrderDetail />
        </div>
      )}

      <FooterBar />
      <MovementsModal open={movOpen} onClose={() => setMovOpen(false)} />
      <CloseShiftModal open={closeOpen} onClose={() => setCloseOpen(false)} />
    </div>
  );
}

export default function CashShell() {
  return (
    <CashKioskProvider>
      <ShellInner />
    </CashKioskProvider>
  );
}

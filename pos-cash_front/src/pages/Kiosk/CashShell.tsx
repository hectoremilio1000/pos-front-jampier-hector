// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/CashShell.tsx

import { Alert, Card, InputNumber, Button, Typography, Space, Spin } from "antd";
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
import XCutModal from "./components/modals/XCutModal";
import OrdersReviewDrawer from "./components/modals/OrdersReviewDrawer";

const { Title, Text } = Typography;
type PrintMode = "local" | "cloud" | "hybrid";

function ShellInner() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [xCutOpen, setXCutOpen] = useState(false);
  const {
    loading,
    openingCash,
    setOpeningCash,
    shiftId,
    sessionId,
    openShift,
    stationCurrent,
    printSettings,
  } = useCash();

  useEffect(() => {
    const MAX_IDLE_MS = 20 * 60 * 1000; // 20 min
    let t: number | undefined;

    const reset = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const hasActiveShift = !!sessionStorage.getItem("cash_shift_id");
        if (hasActiveShift) {
          window.clearTimeout(t);
          reset();
          return;
        }
        console.info("[kiosk] logout por inactividad", { maxIdleMs: MAX_IDLE_MS });
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
  const printerName = stationCurrent?.printerName;
  const printerStatus = String(
    stationCurrent?.printerAvailability ?? stationCurrent?.printerStatus ?? ""
  ).toLowerCase();
  const printerOffline =
    printerName && (printerStatus === "offline" || printerStatus === "down");
  const printerMissing = !printerName;
  const configuredPrintMode = (printSettings?.printMode ||
    "hybrid") as PrintMode;
  const effectivePrintMode =
    configuredPrintMode !== "cloud" && printerMissing
      ? "cloud"
      : configuredPrintMode;

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
      {!hasSession && (
        <Alert
          type="warning"
          showIcon
          message="Turno cerrado"
          description="Abre la caja para empezar a cobrar."
        />
      )}
      {hasSession &&
        effectivePrintMode !== "cloud" &&
        (printerMissing || printerOffline) && (
        <Alert
          type="error"
          showIcon
          message="Impresora no disponible"
          description={
            printerMissing
              ? "No hay impresora configurada para esta estación."
              : "La impresora está reportada como offline."
          }
        />
      )}
      <ActionStrip
        hasShift={hasShift}
        onOpenMov={() => setMovOpen(true)}
        onOpenClose={() => setCloseOpen(true)}
        onOpenCutX={() => setXCutOpen(true)} // ← PASA EL CALLBACK
        onOpenReview={() => setReviewOpen(true)}
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
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
          <OrdersPanel />
          <OrderDetail />
        </div>
      )}

      <FooterBar />
      <MovementsModal open={movOpen} onClose={() => setMovOpen(false)} />
      <CloseShiftModal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onClosed={() => setXCutOpen(true)}
      />
      <XCutModal open={xCutOpen} onClose={() => setXCutOpen(false)} />
      <OrdersReviewDrawer
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
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

import { Button, message, Modal, Space } from "antd";
import { useState } from "react";
import { useCash } from "../context/CashKioskContext";
import TipPayoutModal from "./modals/TipPayoutModal";

import apiCashKiosk from "@/components/apis/apiCashKiosk";

export default function ActionStrip({
  hasShift,
  onOpenMov,
  onOpenClose,
  onOpenCutX,
  onOpenReview,
}: {
  hasShift: boolean;
  onOpenMov?: () => void;
  onOpenClose?: () => void;
  onOpenCutX?: () => void;
  onOpenReview?: () => void;
}) {
  const { orders } = useCash();
  const [openTip, setOpenTip] = useState(false);

  const handleCheques = async () => {
    const ln = orders.length;
    if (ln > 0) {
      return message.warning(
        "Aún hay órdenes sin pagar. Por favor, liquida todas antes de cerrar."
      );
    }
    // Validación propinas pendientes SOLO del turno actual
    const sid = Number(sessionStorage.getItem("cash_shift_id") || 0);
    if (!sid) return message.error("No hay turno activo");

    try {
      const r = await apiCashKiosk.get("/tips/pending", {
        params: { shiftId: sid },
        validateStatus: () => true,
      });
      const pendingCount = Number(r?.data?.orders?.length || 0);
      if (pendingCount > 0) {
        // Confirmación
        Modal.confirm({
          title: "Propinas pendientes",
          content: `Hay ${pendingCount} orden(es) con propina pendiente en este turno. ¿Deseas continuar con el cierre de todos modos?`,
          okText: "Sí, cerrar turno",
          cancelText: "No, ir a pagar propinas",
          onOk: () => onOpenClose?.(),
          onCancel: () => setOpenTip(true),
        });
        return;
      }
    } catch {
      // Si falla la consulta, no bloqueamos, pero avisamos
      message.warning(
        "No se pudo verificar propinas pendientes. Continúa con precaución."
      );
    }

    onOpenClose?.();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Space wrap>
          <Button type="default" disabled={!hasShift} onClick={onOpenMov}>
            Mov. efectivo
          </Button>
          <Button type="default" disabled={!hasShift}>
            Reembolsos
          </Button>
          {/* <Button type="default" disabled={!hasShift}>
            Historial
          </Button> */}
          <Button
            type="default"
            disabled={!hasShift}
            onClick={() => onOpenReview?.()}
          >
            Consultar cuentas
          </Button>
          <Button type="default" onClick={() => onOpenCutX?.()}>
            🧾 Corte de caja X
          </Button>

          <Button
            type="default"
            disabled={!hasShift}
            onClick={() => setOpenTip(true)}
          >
            Pagar propinas
          </Button>
          <Button danger disabled={!hasShift} onClick={handleCheques}>
            Cerrar turno
          </Button>
        </Space>
      </div>

      <TipPayoutModal open={openTip} onClose={() => setOpenTip(false)} />
    </>
  );
}

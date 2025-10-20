// pos-cash/src/pages/Kiosk/components/ActionStrip.tsx
import { Button, Space } from "antd";

export default function ActionStrip({
  hasShift,
  onOpenMov,
  onOpenClose,
}: {
  hasShift: boolean;
  onOpenMov?: () => void;
  onOpenClose?: () => void; // 👈 nuevo
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Space wrap>
        <Button type="default" disabled={!hasShift} onClick={onOpenMov}>
          Mov. efectivo
        </Button>
        <Button type="default" disabled={!hasShift}>
          Reembolsos
        </Button>
        <Button type="default" disabled={!hasShift}>
          Cobros en línea
        </Button>
        <Button type="default" disabled={!hasShift}>
          Historial
        </Button>
        <Button type="default" disabled={!hasShift}>
          Corte X
        </Button>
        <Button danger disabled={!hasShift} onClick={onOpenClose}>
          Cerrar turno
        </Button>
      </Space>
    </div>
  );
}

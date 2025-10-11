import { useEffect, useState } from "react";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import { message, Button, InputNumber } from "antd";

function getShiftId(): number | null {
  const v = sessionStorage.getItem("cash_shift_id");
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}
function setShiftId(id: number) {
  sessionStorage.setItem("cash_shift_id", String(id));
}

export default function CashHome() {
  const [shiftId, setLocalShiftId] = useState<number | null>(getShiftId());
  const [amount, setAmount] = useState<number>(500);

  useEffect(() => {
    // opcional: podrías consultar /shifts/current aquí si lo necesitas
  }, []);

  async function openShift() {
    const restaurantId = Number(import.meta.env.VITE_RESTAURANT_ID || 4);
    const stationCode = import.meta.env.VITE_STATION_CODE || "C01";
    const { data } = await apiCashKiosk.post("/shifts/open", {
      restaurantId,
      stationCode,
      openingCash: 250,
    });
    setLocalShiftId(data.id);
    setShiftId(data.id);
    message.success(`Turno #${data.id} abierto`);
  }

  async function sendIn() {
    if (!shiftId) return message.warning("Abre un turno primero");
    await apiCashKiosk.post(
      "/cash-movements",
      { type: "IN", amount },
      { headers: { "X-Shift-Id": shiftId } }
    );
    message.success("IN registrado");
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">POS Cash</h2>
      <div className="flex gap-2 items-center">
        <Button type="primary" onClick={openShift}>
          Abrir turno
        </Button>
        <span>
          Turno actual: <b>{shiftId ?? "—"}</b>
        </span>
      </div>
      <div className="mt-6 flex gap-2 items-center">
        <InputNumber
          value={amount}
          onChange={(v) => setAmount(Number(v || 0))}
        />
        <Button onClick={sendIn} disabled={!shiftId}>
          IN $
        </Button>
      </div>
    </div>
  );
}

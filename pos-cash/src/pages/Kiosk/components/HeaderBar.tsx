import { Badge, Button } from "antd";
import { kioskLogoutOperator } from "@/components/Kiosk/session";
import { useCashKiosk } from "../hooks/useCashKiosk";

export default function HeaderBar() {
  const { stationCurrent } = useCashKiosk();
  const now = new Date().toLocaleString("es-MX", { hour12: false });
  const label = sessionStorage.getItem("kiosk_device_name") || "Caja";
  const hasShift = !!sessionStorage.getItem("cash_shift_id");

  const logout = () => {
    kioskLogoutOperator(); // borra kiosk_jwt + exp
    // opcional: también puedes limpiar estados efímeros del front si quieres
    window.location.replace("/kiosk-login"); // vuelve a pedir PIN
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-orange-500 text-2xl font-semibold m-0">
          GrowthSuite
        </h2>
        <h3 className="text-blue-600 text-xl font-semibold m-0">Caja</h3>
      </div>

      <div className="flex items-center gap-3">
        <Button size="small" onClick={logout}>
          Cerrar sesión
        </Button>
        <div className="text-right text-xs text-gray-500">
          <div>{now}</div>
          <div className="mt-1 flex items-center gap-1 justify-end">
            <span
              className={`inline-block w-2 h-2 rounded-full ${hasShift ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>{hasShift ? `Emparejado: ${label}` : "Sin turno"}</span>
            <span>Mode: {stationCurrent?.mode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

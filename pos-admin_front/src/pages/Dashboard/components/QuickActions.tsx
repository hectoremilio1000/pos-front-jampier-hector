import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const nav = useNavigate();
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col gap-2">
      <div className="text-sm text-gray-500">Acciones rápidas</div>
      <button
        onClick={() => nav("/control")}
        className="w-full py-2 rounded bg-blue-600 text-white"
      >
        🛒 Abrir Punto de venta
      </button>
      <button
        onClick={() => nav("/facturas")}
        className="w-full py-2 rounded bg-emerald-600 text-white"
      >
        🧾 Emitir factura
      </button>
      <button
        onClick={() => nav("/reportes?range=today")}
        className="w-full py-2 rounded bg-gray-800 text-white"
      >
        📈 Reporte del día
      </button>
    </div>
  );
}

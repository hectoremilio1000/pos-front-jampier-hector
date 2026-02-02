import { Tag } from "antd";

type Station = {
  id: number;
  name: string;
  mode: string;
};
type Session = {
  id: number;
  openingCash?: number;
  expectedCash?: number;
  difference?: number;
  status: string;
  station: Station;
};
export default function StatePanel({
  cashOpen,
  staff,
  cancelledOrders,
  cancelledItems,
}: {
  cashOpen: {
    count: number;
    sessions: Session[];
  };
  staff: { waiters: number; cashiers: number; bartenders: number };
  cancelledOrders: number;
  cancelledItems: { qty: number; amount: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="text-lg font-bold text-gray-500 mb-1">
          Cajas abiertas
        </div>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {cashOpen.sessions.length > 0 &&
            cashOpen?.sessions?.map((s, index) => {
              return (
                <div key={index} className="card">
                  <Tag>{s.status}</Tag>
                  <p>
                    {s.station.name} : {s.station.mode}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-lg font-bold text-gray-500 mb-1">
          Cuentas canceladas
        </div>
        <div className="text-lg font-semibold">{cancelledOrders}</div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-lg font-bold text-gray-500 mb-1">
          Productos cancelados
        </div>
        <div className="text-lg font-semibold">
          {cancelledItems.qty} piezas
        </div>
        <div className="text-sm text-gray-500">
          ${cancelledItems.amount.toFixed(2)}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-lg font-bold text-gray-500 mb-1">
          Staff en turno
        </div>
        <div className="text-sm">
          👨‍🍳 Meseros {staff.waiters} · 💳 Cajeros {staff.cashiers}
        </div>
      </div>
    </div>
  );
}

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
  tables,
  staff,
  ordersCancel,
}: {
  cashOpen: {
    count: number;
    sessions: Session[];
  };
  tables: { total: number; byArea: { name: string; count: number }[] };
  staff: { waiters: number; cashiers: number; bartenders: number };
  ordersCancel: [];
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
        <div className="text-lg font-semibold">{ordersCancel.length}</div>
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

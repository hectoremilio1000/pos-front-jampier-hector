export default function StatePanel({
  cashOpen,
  tables,
  orders,
  staff,
}: {
  cashOpen: { count: number; items: { cashier: string; balance: number }[] };
  tables: { total: number; byArea: { name: string; count: number }[] };
  orders: { kitchen: number; bar: number; expo: number };
  staff: { waiters: number; cashiers: number; bartenders: number };
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Cajas abiertas</div>
        <div className="text-lg font-semibold">{cashOpen.count}</div>
        <ul className="mt-2 text-sm text-gray-700">
          {cashOpen.items.map((x, i) => (
            <li key={i}>
              🧾 {x.cashier}: ${x.balance.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Mesas abiertas</div>
        <div className="text-lg font-semibold">{tables.total}</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {tables.byArea.map((a) => (
            <span
              key={a.name}
              className="text-xs bg-gray-100 px-2 py-1 rounded"
            >
              {a.name}: {a.count}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Órdenes activas</div>
        <div className="flex gap-2 mt-1 text-sm">
          <span className="px-2 py-1 rounded bg-blue-50">
            Cocina {orders.kitchen}
          </span>
          <span className="px-2 py-1 rounded bg-purple-50">
            Bar {orders.bar}
          </span>
          <span className="px-2 py-1 rounded bg-amber-50">
            Expo {orders.expo}
          </span>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Staff en turno</div>
        <div className="text-sm">
          👨‍🍳 Meseros {staff.waiters} · 💳 Cajeros {staff.cashiers} · 🍸 Barra{" "}
          {staff.bartenders}
        </div>
      </div>
    </div>
  );
}

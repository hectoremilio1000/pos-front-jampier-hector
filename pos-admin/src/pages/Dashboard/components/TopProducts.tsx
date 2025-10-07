export default function TopProducts({
  rows,
}: {
  rows: { name: string; qty: number; amount: number }[];
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500 mb-3">
        Top 5 productos más vendidos
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between text-sm">
            <span>{r.name}</span>
            <span className="text-gray-500">
              {r.qty} · ${r.amount.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CategoryBars({
  rows,
}: {
  rows: { name: string; amount: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500 mb-3">Categorías más fuertes</div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{r.name}</span>
              <span>${r.amount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded">
              <div
                className="h-2 rounded bg-blue-500"
                style={{ width: `${(r.amount / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

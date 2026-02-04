export default function AlertsList({
  rows,
}: {
  rows: { type: "danger" | "warning" | "info"; text: string }[];
}) {
  const color = (t: string) =>
    t === "danger"
      ? "border-red-300 bg-red-50"
      : t === "warning"
        ? "border-amber-300 bg-amber-50"
        : "border-blue-300 bg-blue-50";
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500 mb-2">Alertas</div>
      <ul className="space-y-2">
        {rows.map((a, i) => (
          <li
            key={i}
            className={`text-sm px-3 py-2 rounded border ${color(a.type)}`}
          >
            ❗ {a.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

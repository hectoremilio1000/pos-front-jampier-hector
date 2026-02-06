export default function TrendPill({ delta }: { delta?: number }) {
  if (delta === undefined) return null;
  const up = delta >= 0;
  const color = up ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";
  const sign = up ? "▲" : "▼";
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${color}`}>
      {sign} {Math.abs(delta)}%
    </span>
  );
}

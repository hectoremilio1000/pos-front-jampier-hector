export default function HourlySparkline({
  points,
}: {
  points: { hour: string; amount: number }[];
}) {
  const w = 260,
    h = 70,
    pad = 6;
  const xs = points.map(
    (_, i) => pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1)
  );
  const ys = (() => {
    const max = Math.max(...points.map((p) => p.amount), 1);
    return points.map((p) => h - pad - (p.amount / max) * (h - pad * 2));
  })();
  const d = points.length
    ? `M ${xs[0]},${ys[0]} ` +
      xs
        .slice(1)
        .map((x, i) => `L ${x},${ys[i + 1]}`)
        .join(" ")
    : "";
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-500 mb-2">Horas pico de hoy</div>
      <svg width={w} height={h}>
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          className="text-blue-600"
          strokeWidth="2"
        />
      </svg>
      <div className="text-[10px] text-gray-500 mt-1">0–23h</div>
    </div>
  );
}

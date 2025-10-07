import TrendPill from "./TrendPill";

export default function KpiCard({
  icon,
  label,
  value,
  delta,
  tone = "default",
}: {
  icon?: string;
  label: string;
  value: number | string;
  delta?: number;
  tone?: "green" | "red" | "yellow" | "default";
}) {
  const toneMap: Record<string, string> = {
    green: "border-green-200",
    red: "border-red-200",
    yellow: "border-yellow-200",
    default: "border-gray-200",
  };
  return (
    <div
      className={`border ${toneMap[tone]} rounded-2xl p-4 flex items-center gap-3 bg-white`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-semibold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      </div>
      <TrendPill delta={delta} />
    </div>
  );
}

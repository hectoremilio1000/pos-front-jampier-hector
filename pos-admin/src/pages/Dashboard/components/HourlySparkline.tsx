import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Point = {
  hour: string; // "0"..."23" o "00"..."23"
  amount: number;
};

export default function HourlySalesChart({ points }: { points: Point[] }) {
  // Normalizamos a 24 horas (0-23) para que siempre haya algo en el eje X
  const hours = Array.from({ length: 24 }, (_, i) => i);
  console.log(points);
  const data = hours.map((h) => {
    const found = points.find((p) => Number(p.hour) === h);
    return {
      hour: `${h.toString().padStart(2, "0")}:00`,
      amount: found?.amount ?? 0,
    };
  });

  // Cálculos de resumen
  const totalDay = data.reduce((acc, p) => acc + Number(p.amount), 0);

  const maxPoint = data.reduce((max, p) => (p.amount > max.amount ? p : max), {
    hour: "--",
    amount: 0,
  });

  return (
    <div className="rounded-xl border bg-white p-4 col-span-2 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-500">
            Horas pico de hoy
          </div>
          <div className="text-xs text-gray-400">Ventas por hora (0–23h)</div>
        </div>

        <div className="text-right text-xs">
          <div className="text-gray-500">Total del día</div>
          <div className="text-base font-bold text-gray-900">
            ${totalDay.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              interval={3} // muestra cada 3 horas para que no se llene tanto
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                `$${Number(v).toLocaleString("es-MX", {
                  maximumFractionDigits: 0,
                })}`
              }
            />
            <Tooltip
              formatter={(value) =>
                `$${Number(value).toLocaleString("es-MX", {
                  maximumFractionDigits: 2,
                })}`
              }
              labelFormatter={(label) => `Hora: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-600">
        <div>
          <span className="font-semibold">Hora con más ventas: </span>
          {maxPoint.amount > 0 ? (
            <>
              <span>{maxPoint.hour}</span>{" "}
              <span className="ml-1">
                ($
                {maxPoint.amount.toLocaleString("es-MX", {
                  maximumFractionDigits: 2,
                })}
                )
              </span>
            </>
          ) : (
            <span>Sin ventas registradas hoy</span>
          )}
        </div>

        <div className="text-gray-400">
          Actualiza al re-render del componente
        </div>
      </div>
    </div>
  );
}

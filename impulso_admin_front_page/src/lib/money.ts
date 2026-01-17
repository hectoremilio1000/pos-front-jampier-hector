export function money(
  value: string | number | null | undefined,
  currency = "MXN"
) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    n
  );
}

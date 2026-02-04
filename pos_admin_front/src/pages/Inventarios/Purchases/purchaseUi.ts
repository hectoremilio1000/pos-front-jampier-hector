import type { PurchaseOrderRow, PurchaseRunRow } from "@/lib/api_inventory";

export type OrderOriginKey = "comisariato" | "proveedor" | "mixto";
export type RunTypeKey = "comisariato" | "ruta" | "desconocido";

const RUN_TYPE_PREFIX = "#tipo:";

export function getOrderOrigin(order?: PurchaseOrderRow | null) {
  if (!order) return { key: "proveedor" as OrderOriginKey, label: "Proveedor" };
  if (order.purchaseRunId) {
    return { key: "comisariato" as OrderOriginKey, label: "Comisariato/tiendas" };
  }
  return { key: "proveedor" as OrderOriginKey, label: "Proveedor" };
}

export function orderOriginTagColor(key: OrderOriginKey) {
  switch (key) {
    case "comisariato":
      return "gold";
    case "mixto":
      return "lime";
    case "proveedor":
    default:
      return "geekblue";
  }
}

export function orderStatusTagColor(status?: PurchaseOrderRow["status"]) {
  switch (status) {
    case "received":
      return "green";
    case "confirmed":
      return "blue";
    case "cancelled":
      return "red";
    case "draft":
    default:
      return "default";
  }
}

export function runStatusTagColor(status?: PurchaseRunRow["status"]) {
  switch (status) {
    case "closed":
      return "green";
    case "in_progress":
      return "blue";
    case "cancelled":
      return "red";
    case "draft":
    default:
      return "default";
  }
}

export function stockRequestStatusTagColor(status?: string) {
  switch (status) {
    case "fulfilled":
      return "green";
    case "in_progress":
      return "blue";
    case "cancelled":
      return "red";
    case "draft":
    default:
      return "default";
  }
}

export function getRunType(run?: PurchaseRunRow | null): RunTypeKey {
  if (!run?.notes) return "desconocido";
  const match = run.notes
    .split("\n")
    .find((line) => line.trim().toLowerCase().startsWith(RUN_TYPE_PREFIX));

  if (!match) return "desconocido";
  const value = match.trim().slice(RUN_TYPE_PREFIX.length).trim().toLowerCase();
  if (value === "comisariato") return "comisariato";
  if (value === "ruta") return "ruta";
  return "desconocido";
}

export function buildRunNotes(notes: string | null | undefined, type: RunTypeKey) {
  const base = notes ? String(notes).trim() : "";
  const typeLine = `${RUN_TYPE_PREFIX}${type}`;
  return base ? `${typeLine}\n${base}` : typeLine;
}

export function stripRunNotes(notes?: string | null) {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith(RUN_TYPE_PREFIX))
    .join("\n")
    .trim();
}

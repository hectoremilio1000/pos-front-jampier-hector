/**
 * Cliente y helpers de Inventario.
 * - Base: VITE_API_URL_INVENTORY o VITE_API_INVENTORY_BASE (ej: http://localhost:3344)
 * - Envía restaurantId como query param y también header x-restaurant-id (compatibilidad)
 */

import { getFreshAccessJwt } from "@/components/Auth/token";

export type Id = number;

export type RestaurantScoped = { restaurantId: Id };

export type MeasurementUnitRow = {
  id: Id;
  code: string;
  name: string;
  symbol?: string | null;
};

export type SupplierTypeRow = {
  id: Id;
  code: string;
  description?: string | null;
  name?: string | null;
};

export type InventoryGroupRow = {
  id: Id;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  priority?: number | null;
};

export type InventoryItemRow = {
  id: Id;
  restaurantId?: Id;
  code: string;
  name: string;
  description?: string | null;
  kind?: "raw" | "packaging" | "service" | string;
  isActive?: boolean;
  groupId?: Id | null;
  unitId?: Id;
  group?: InventoryGroupRow | null;
  unit?: MeasurementUnitRow | null;
  photos?: Array<{
    id: Id;
    url: string;
    sortOrder?: number | null;
  }>;
  createdAt?: string;
};

export type InventoryPresentationRow = {
  id: Id;
  inventoryItemId: Id;
  name: string;
  code?: string; // ✅
  contentInBaseUnit: number;
  presentationUnitId?: Id | null;
  presentationLabel?: string | null; // ✅
  isActive?: boolean;
  isDefaultPurchase?: boolean;

  // ✅ viene del backend
  usageCount?: number;
  canDelete?: boolean;
  defaultSupplierLastCost?: number | null;

  item?: InventoryItemRow | null;
  presentationUnit?: MeasurementUnitRow | null;
  detail?: InventoryPresentationDetailRow | null;
};

export type InventoryPresentationDetailRow = {
  id: Id;
  presentationId: Id;

  lastCost?: number | null;
  averageCost?: number | null;

  supplierId?: Id | null;
  supplier?: SupplierRow | null;

  tax1Rate?: number | null;
  tax2Rate?: number | null;
  tax3Rate?: number | null;
  taxIndicator?: string | null;

  status?: number | null;
  autoDecrementOnUse?: boolean | null;
  location?: string | null;
  locationId?: Id | null;
  useScale?: boolean | null;

  standardCost?: number | null;

  createdAt?: string;
  updatedAt?: string;
};

export type InventoryPresentationSupplierCostRow = {
  id: Id;
  restaurantId: Id;
  supplierId: Id;
  presentationId: Id;

  lastCost?: number | null;
  lastPurchaseAt?: string | null;

  supplier?: SupplierRow | null;

  createdAt?: string;
  updatedAt?: string;
};

export type WarehouseRow = {
  id: Id;
  code?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type WarehouseLocationRow = {
  id: Id;
  restaurantId?: Id;
  warehouseId: Id;
  warehouse?: WarehouseRow | null;
  name: string;
  parentId?: Id | null;
  isActive?: boolean;
};

export type SupplierRow = {
  id: Id;
  code: string; // ✅ REQUIRED por DB (NOT NULL)
  name: string;
  supplierTypeId?: Id | null;
  isActive?: boolean;
  supplierType?: SupplierTypeRow | null;
  taxName?: string | null;
  taxId?: string | null;
  address?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  creditDays?: number | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankClabe?: string | null;
  autoDecrementEnabled?: boolean;
  isDefault?: boolean;
};

export type SupplierMarketRow = {
  id: Id;
  code?: string | null;
  name: string;
  description?: string | null;
  isActive?: boolean;
  supplierId?: Id | null;
  supplier?: SupplierRow | null;
};

export type SupplierMarketSupplierRow = {
  id: Id;
  supplierMarketId: Id;
  supplierId: Id;
  supplier?: SupplierRow | null;
  market?: SupplierMarketRow | null;
};

export type PurchaseRouteRow = {
  id: Id;
  name: string;
  isActive?: boolean;
};

export type PurchaseOrderRow = {
  id: Id;
  restaurantId?: Id;

  purchaseRunId?: Id | null;
  items?: PurchaseOrderItemRow[];
  itemsCount?: number;

  supplierId?: Id | null;
  warehouseId?: Id | null;

  documentNumber?: string | null;
  invoiceNumber?: string | null;
  orderNumber?: number | null;

  issueDate?: string | null; // DATE
  applicationDate?: string | null; // DATE
  dueDate?: string | null; // DATE
  receivedAt?: string | null; // TIMESTAMP

  status?: "draft" | "confirmed" | "received" | "cancelled" | string;

  reference?: string | null;
  createdBy?: string | null;

  // si tu backend preloads:
  supplier?: SupplierRow | null;
  warehouse?: WarehouseRow | null;
  purchaseRun?: PurchaseRunRow | null;

  createdAt?: string;
  updatedAt?: string;
};

export type StockCountRow = {
  id: Id;
  name?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  countedBy?: string | null;
  closedBy?: string | null;
  warehouseId: Id;
  warehouse?: WarehouseRow | null;
  status: "in_progress" | "closed" | "cancelled" | string;
  startedAt: string; // ISO
  finishedAt?: string | null;
  itemsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StockCountItemRow = {
  id: Id;
  stockCountId: Id;
  inventoryItemId: Id;
  presentationId: Id;
  notes?: string | null;

  theoreticalQtyBase?: number | null;
  countedQtyBase?: number | null;
  differenceQtyBase?: number | null;
  unitCostAtCount?: number | null;
  differenceTotalCost?: number | null;

  inventoryItem?: Pick<InventoryItemRow, "id" | "code" | "name" | "unit">;
  item?: Pick<InventoryItemRow, "id" | "code" | "name" | "unit">;
  presentation?: Pick<
    InventoryPresentationRow,
    "id" | "name" | "contentInBaseUnit" | "presentationUnit"
  >;
};

export type StockCountDetail = StockCountRow & {
  warehouse?: WarehouseRow;
  items: StockCountItemRow[];
};

export type InventoryCutRow = {
  inventoryItemId: Id;
  code?: string | null;
  name?: string | null;
  unitCode?: string | null;
  initialQtyBase: number;
  movementQtyBase: number;
  theoreticalQtyBase: number;
  finalQtyBase?: number | null;
  diffQtyBase?: number | null;
  unitCost?: number | null;
  diffCost?: number | null;
};

export type InventoryCutTotals = {
  initialQtyBase: number;
  movementQtyBase: number;
  theoreticalQtyBase: number;
  finalQtyBase?: number | null;
  diffQtyBase?: number | null;
  diffCost?: number | null;
};

export type InventoryCutResponse = {
  ok: true;
  range: { start: string; end: string };
  warehouseId: Id;
  initialCount: { id: Id; finishedAt?: string | null };
  finalCount?: { id: Id; finishedAt?: string | null } | null;
  movementTypes: string[];
  totals: InventoryCutTotals;
  rows: InventoryCutRow[];
};

export type InventoryCutRequest = {
  initialCountId: Id;
  finalCountId?: Id | null;
  endDate?: string | null;
  movementTypes?: string[];
  itemIds?: Id[];
  warehouseId?: Id | null;
};

export type InventoryCutCreateResponse = InventoryCutResponse & {
  cutId: Id;
};

export type InventoryCutSummaryRow = {
  id: Id;
  compareMode: "theoretical" | "count" | string;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  endAt?: string | null;
  movementTypes: string[];
  itemScope: "all" | "selected" | string;
  initialCountId: Id;
  finalCountId?: Id | null;
  initialCountName?: string | null;
  initialCountFinishedAt?: string | null;
  finalCountName?: string | null;
  finalCountFinishedAt?: string | null;
  totals: InventoryCutTotals;
  createdAt?: string | null;
};

export type ExternalRefRow = {
  id: Id;
  entityType: string;
  entityId: string | number;
  externalSystem: string;
  externalId: string;
  createdAt?: string;
};

export type PrintAreaWarehouseMapRow = {
  id: Id;
  printAreaId: Id;
  warehouseId: Id;
  isActive?: boolean;
};

export type InventoryRecipeRow = {
  id: Id;
  posProductId?: Id | null;
  posProductCode?: string | null;
  name: string;
  isActive?: boolean;
  recipeType?: "internal" | "pos" | string;
  linesCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryRecipeLineRow = {
  id: Id;
  recipeId: Id;
  inventoryItemId?: Id | null;
  presentationId?: Id | null;
  subRecipeId?: Id | null;
  qtyBase: number;
  wastePct?: number | null;
  wastePercent?: number | null;
  subRecipe?: Pick<InventoryRecipeRow, "id" | "name" | "recipeType"> | null;
  item?: Pick<InventoryItemRow, "id" | "code" | "name" | "unit"> | null;
  presentation?: InventoryPresentationRow | null;
};

export type PosProductRow = {
  id: Id;
  code?: string | null;
  name: string;
};

function getApiBase(): string {
  const env = (import.meta as any).env ?? {};
  const raw =
    (env.VITE_API_URL_INVENTORY as string | undefined) ??
    (env.VITE_API_INVENTORY_BASE as string | undefined);
  const base = (raw?.trim() || "http://localhost:3344").replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function toQueryString(qs?: Record<string, unknown>): string {
  if (!qs) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function http<T>(
  path: string,
  opts: {
    method?: string;
    restaurantId?: Id;
    body?: any;
    headers?: Record<string, string>;
    qs?: Record<string, unknown>;
    isForm?: boolean;
  } = {}
): Promise<T> {
  const apiBase = getApiBase();
  const method = opts.method ?? (opts.body ? "POST" : "GET");
  const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}${toQueryString(opts.qs)}`;

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (typeof window !== "undefined") {
    const hasToken = !!sessionStorage.getItem("access_jwt");
    if (hasToken) {
      try {
        const jwt = await getFreshAccessJwt();
        if (jwt) headers.Authorization = `Bearer ${jwt}`;
      } catch {
        // Si no hay refresh válido, seguimos sin auth para no bloquear.
      }
    }
  }

  if (opts.restaurantId) {
    // compatibilidad: query param y header
    headers["x-restaurant-id"] = String(opts.restaurantId);
  }

  const init: RequestInit = { method, headers };

  if (opts.body !== undefined) {
    if (opts.isForm) {
      init.body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    // intenta leer JSON de error
    try {
      const j = JSON.parse(text);
      const msg = j?.message || j?.error || res.statusText;
      throw new Error(`${res.status} ${msg}`);
    } catch {
      throw new Error(`${res.status} ${text || res.statusText}`);
    }
  }

  if (!text) return undefined as any;
  try {
    return JSON.parse(text) as T;
  } catch {
    // si el backend regresa texto plano
    return text as any as T;
  }
}

/** ===== Catálogos globales ===== */
export function listMeasurementUnits(): Promise<MeasurementUnitRow[]> {
  return http<MeasurementUnitRow[]>("/measurement-units");
}
export function listSupplierTypes(): Promise<SupplierTypeRow[]> {
  return http<SupplierTypeRow[]>("/supplier-types");
}

export function createSupplierType(payload: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<SupplierTypeRow> {
  return http<SupplierTypeRow>("/supplier-types", {
    method: "POST",
    body: payload,
  });
}

/** ===== Grupos / Items / Presentaciones ===== */
export function listInventoryGroups(restaurantId: Id): Promise<InventoryGroupRow[]> {
  return http<InventoryGroupRow[]>("/inventory/groups", {
    restaurantId,
    qs: { restaurantId },
  });
}

export function upsertInventoryGroup(
  restaurantId: Id,
  payload: Partial<InventoryGroupRow> & Pick<InventoryGroupRow, "code" | "name">
): Promise<InventoryGroupRow> {
  // si trae id -> PUT, si no -> POST
  if (payload.id) {
    return http<InventoryGroupRow>(`/inventory/groups/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<InventoryGroupRow>("/inventory/groups", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function listInventoryItems(restaurantId: Id, q?: string): Promise<InventoryItemRow[]> {
  return http<InventoryItemRow[]>("/inventory/items", {
    restaurantId,
    qs: { restaurantId, q },
  });
}

export function getInventoryItem(restaurantId: Id, itemId: Id): Promise<InventoryItemRow> {
  return http<InventoryItemRow>(`/inventory/items/${itemId}`, {
    restaurantId,
    qs: { restaurantId },
  });
}

export function upsertInventoryItem(
  restaurantId: Id,
  payload: Partial<InventoryItemRow> & Pick<InventoryItemRow, "code" | "name">
): Promise<InventoryItemRow> {
  if (payload.id) {
    return http<InventoryItemRow>(`/inventory/items/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<InventoryItemRow>("/inventory/items", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function deactivateInventoryItem(restaurantId: Id, itemId: Id): Promise<InventoryItemRow> {
  return http<InventoryItemRow>(`/inventory/items/${itemId}`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: { isActive: false },
  });
}

/** Presentaciones */
export function listInventoryPresentations(
  restaurantId: Id,
  opts: { q?: string; inventoryItemId?: Id } = {}
): Promise<InventoryPresentationRow[]> {
  // Si viene inventoryItemId, usa el endpoint real:
  if (opts.inventoryItemId) {
    return http<InventoryPresentationRow[]>(
      `/inventory/items/${opts.inventoryItemId}/presentations`,
      { restaurantId, qs: { restaurantId } }
    );
  }

  // Si NO viene item, usa search (q opcional)
  return http<InventoryPresentationRow[]>("/inventory/presentations/search", {
    restaurantId,
    qs: { restaurantId, q: opts.q },
  });
}

export function searchInventoryPresentations(
  restaurantId: Id,
  q?: string,
  supplierId?: Id | null
): Promise<InventoryPresentationRow[]> {
  return http<InventoryPresentationRow[]>("/inventory/presentations/search", {
    restaurantId,
    qs: { restaurantId, q, supplierId },
  });
}

export function upsertInventoryPresentation(
  restaurantId: Id,
  payload: Partial<InventoryPresentationRow> &
    Pick<InventoryPresentationRow, "inventoryItemId" | "name" | "contentInBaseUnit">
): Promise<InventoryPresentationRow> {
  if (payload.id) {
    // update por id (déjalo así si tu backend lo soporta)
    return http<InventoryPresentationRow>(`/inventory/presentations/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }

  // ✅ create anidado al item (consistente con tu GET)
  return http<InventoryPresentationRow>("/inventory/presentations", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: {
      inventoryItemId: payload.inventoryItemId,
      name: payload.name,
      code: payload.code ?? null,
      presentationLabel: payload.presentationLabel ?? null,
      contentInBaseUnit: payload.contentInBaseUnit,
      presentationUnitId: payload.presentationUnitId ?? null,
      isDefaultPurchase: payload.isDefaultPurchase ?? false,
      isActive: payload.isActive !== false,
    },
  });
}

export function upsertInventoryPresentationDetail(
  restaurantId: Id,
  presentationId: Id,
  payload: Partial<InventoryPresentationDetailRow>
): Promise<InventoryPresentationDetailRow> {
  return http<InventoryPresentationDetailRow>(`/inventory/presentations/${presentationId}/detail`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}


export function deleteInventoryPresentation(restaurantId: Id, presentationId: Id): Promise<any> {
  return http<any>(`/inventory/presentations/${presentationId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function listPresentationSupplierCosts(
  restaurantId: Id,
  presentationId: Id
): Promise<InventoryPresentationSupplierCostRow[]> {
  return http<InventoryPresentationSupplierCostRow[]>(
    `/inventory/presentations/${presentationId}/supplier-costs`,
    { restaurantId, qs: { restaurantId } }
  );
}

export function upsertPresentationSupplierCost(
  restaurantId: Id,
  presentationId: Id,
  supplierId: Id,
  payload: { lastCost?: number | null }
): Promise<InventoryPresentationSupplierCostRow> {
  return http<InventoryPresentationSupplierCostRow>(
    `/inventory/presentations/${presentationId}/supplier-costs/${supplierId}`,
    {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    }
  );
}

export function deletePresentationSupplierCost(
  restaurantId: Id,
  presentationId: Id,
  supplierId: Id
): Promise<any> {
  return http<any>(`/inventory/presentations/${presentationId}/supplier-costs/${supplierId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

/** Fotos de item (ajusta rutas si tu backend usa otras) */
export async function uploadInventoryItemPhoto(
  restaurantId: Id,
  itemId: Id,
  file: File
): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  return http<any>(`/inventory/items/${itemId}/photos`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: form,
    isForm: true,
  });
}
export async function deleteInventoryItemPhoto(
  restaurantId: Id,
  itemId: Id,
  photoId: Id
): Promise<any> {
  return http<any>(`/inventory/items/${itemId}/photos/${photoId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

/** ===== Almacenes ===== */
export function listWarehouses(restaurantId: Id): Promise<WarehouseRow[]> {
  return http<WarehouseRow[]>("/inventory/warehouses", { restaurantId, qs: { restaurantId } });
}
export function upsertWarehouse(
  restaurantId: Id,
  payload: Partial<WarehouseRow> & Pick<WarehouseRow, "name">
): Promise<WarehouseRow> {
  if (payload.id) {
    return http<WarehouseRow>(`/inventory/warehouses/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<WarehouseRow>("/inventory/warehouses", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

/** ===== Ubicaciones de almacén ===== */
export function listWarehouseLocations(
  restaurantId: Id,
  params?: { warehouseId?: Id | null; q?: string; isActive?: boolean }
): Promise<WarehouseLocationRow[]> {
  return http<WarehouseLocationRow[]>("/inventory/warehouse-locations", {
    restaurantId,
    qs: { restaurantId, warehouseId: params?.warehouseId, q: params?.q, isActive: params?.isActive },
  });
}

export function upsertWarehouseLocation(
  restaurantId: Id,
  payload: Partial<WarehouseLocationRow> & Pick<WarehouseLocationRow, "name" | "warehouseId">
): Promise<WarehouseLocationRow> {
  if (payload.id) {
    return http<WarehouseLocationRow>(`/inventory/warehouse-locations/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }

  return http<WarehouseLocationRow>("/inventory/warehouse-locations", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

/** ===== Proveedores ===== */
export function listSuppliers(restaurantId: Id): Promise<SupplierRow[]> {
  return http<SupplierRow[]>("/suppliers", { restaurantId, qs: { restaurantId } });
}
export function upsertSupplier(
  restaurantId: Id,
  payload: Partial<SupplierRow> & Pick<SupplierRow, "code" | "name">
): Promise<SupplierRow> {
  if (payload.id) {
    return http<SupplierRow>(`/suppliers/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<SupplierRow>("/suppliers", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function listSupplierMarkets(
  restaurantId: Id,
  supplierId?: Id
): Promise<SupplierMarketRow[]> {
  return http<SupplierMarketRow[]>("/supplier-markets", {
    restaurantId,
    qs: { restaurantId, supplierId },
  });
}
export function upsertSupplierMarket(
  restaurantId: Id,
  payload: Partial<SupplierMarketRow> & Pick<SupplierMarketRow, "name">
): Promise<SupplierMarketRow> {
  if (payload.id) {
    return http<SupplierMarketRow>(`/supplier-markets/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<SupplierMarketRow>("/supplier-markets", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function listSupplierMarketSuppliers(
  restaurantId: Id,
  marketId: Id
): Promise<SupplierMarketSupplierRow[]> {
  return http<SupplierMarketSupplierRow[]>(`/supplier-markets/${marketId}/suppliers`, {
    restaurantId,
    qs: { restaurantId },
  });
}

export function addSupplierMarketSupplier(
  restaurantId: Id,
  marketId: Id,
  supplierId: Id
): Promise<SupplierMarketSupplierRow> {
  return http<SupplierMarketSupplierRow>(`/supplier-markets/${marketId}/suppliers`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: { supplierId },
  });
}

export function deleteSupplierMarketSupplier(
  restaurantId: Id,
  marketId: Id,
  id: Id
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/supplier-markets/${marketId}/suppliers/${id}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}
export function listPurchaseRoutes(restaurantId: Id): Promise<PurchaseRouteRow[]> {
  return http<PurchaseRouteRow[]>("/purchase-routes", { restaurantId, qs: { restaurantId } });
}

/** ===== Compras ===== */
export function listPurchaseOrders(restaurantId: Id): Promise<PurchaseOrderRow[]> {
  return http<PurchaseOrderRow[]>("/purchase-orders", { restaurantId, qs: { restaurantId } });
}

export function getPurchaseOrder(restaurantId: Id, id: Id): Promise<PurchaseOrderRow> {
  return http<PurchaseOrderRow>(`/purchase-orders/${id}`, { restaurantId, qs: { restaurantId } });
}

export function createPurchaseOrder(restaurantId: Id, payload: any): Promise<PurchaseOrderRow> {
  return http<PurchaseOrderRow>("/purchase-orders", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function updatePurchaseOrder(
  restaurantId: Id,
  id: Id,
  payload: any
): Promise<PurchaseOrderRow> {
  return http<PurchaseOrderRow>(`/purchase-orders/${id}`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function deletePurchaseOrder(restaurantId: Id, id: Id): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/purchase-orders/${id}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

// ✅ backend tiene PUT /purchase-orders/:id (updatePurchaseOrder)
export function addPurchaseOrderItem(restaurantId: Id, id: Id, payload: any): Promise<any> {
  return http<any>(`/purchase-orders/${id}/items`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function updatePurchaseOrderItem(
  restaurantId: Id,
  id: Id,
  itemId: Id,
  payload: { quantity?: number; unitPrice?: number; notes?: string | null }
): Promise<PurchaseOrderItemRow> {
  return http<PurchaseOrderItemRow>(`/purchase-orders/${id}/items/${itemId}`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function deletePurchaseOrderItem(
  restaurantId: Id,
  id: Id,
  itemId: Id
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/purchase-orders/${id}/items/${itemId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function receivePurchaseOrder(
  restaurantId: Id,
  id: Id,
  payload?: {
    receivedAt?: string;
    items?: Array<{ id: Id; receivedQty: number | null; unitPrice?: number | null }>;
  }
): Promise<any> {
  return http<any>(`/purchase-orders/${id}/receive`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export type PurchaseOrderItemRow = {
  id: Id;
  purchaseOrderId?: Id;
  presentationId: Id;
  quantity: number;
  receivedQty?: number | null;
  unitPrice: number;
  discountAmount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  lineSubtotal?: number | null;
  lineTotal?: number | null;
  notes?: string | null;

  // preload del backend
  presentation?: InventoryPresentationRow | null;

  createdAt?: string;
  updatedAt?: string;
};

export type StockRequestItemRow = {
  id: Id;
  stockRequestId?: Id;
  presentationId: Id;
  quantity: number;
  fulfilledQty?: number | null;
  notes?: string | null;

  presentation?: InventoryPresentationRow | null;

  createdAt?: string;
  updatedAt?: string;
};

export type StockRequestRow = {
  id: Id;
  restaurantId?: Id;

  purchaseRunId?: Id | null;
  items?: StockRequestItemRow[];

  warehouseId: Id;
  sourceWarehouseId?: Id | null;

  areaLabel?: string | null;
  status?: "draft" | "in_progress" | "fulfilled" | "cancelled" | string;

  requestedAt?: string; // TIMESTAMP
  fulfilledAt?: string | null; // TIMESTAMP

  notes?: string | null;
  createdBy?: string | null;
  fulfilledBy?: string | null;

  warehouse?: WarehouseRow | null;
  sourceWarehouse?: WarehouseRow | null;
  purchaseRun?: PurchaseRunRow | null;

  createdAt?: string;
  updatedAt?: string;
};

/** ===== purchase runs ===== */
export type PurchaseRunRow = {
  id: Id;
  restaurantId?: Id;
  runNumber?: number;
  runCode: string;
  title?: string | null;
  runAt: string;
  status: "draft" | "in_progress" | "closed" | "cancelled" | string;
  notes?: string | null;
  createdBy?: string | null;
  closedBy?: string | null;
  purchaseOrdersCount?: number;
  stockRequestsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseRunDetail = PurchaseRunRow & {
  purchaseOrders: PurchaseOrderRow[];
  stockRequests?: StockRequestRow[];
};

/** ===== stock requests ===== */
export function listStockRequests(
  restaurantId: Id,
  opts: { purchaseRunId?: Id; status?: string; warehouseId?: Id } = {}
): Promise<StockRequestRow[]> {
  return http<StockRequestRow[]>("/stock-requests", {
    restaurantId,
    qs: { restaurantId, ...opts },
  });
}

export function getStockRequest(restaurantId: Id, id: Id): Promise<StockRequestRow> {
  return http<StockRequestRow>(`/stock-requests/${id}`, {
    restaurantId,
    qs: { restaurantId },
  });
}

export function createStockRequest(restaurantId: Id, payload: any): Promise<StockRequestRow> {
  return http<StockRequestRow>("/stock-requests", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function updateStockRequest(
  restaurantId: Id,
  id: Id,
  payload: any
): Promise<StockRequestRow> {
  return http<StockRequestRow>(`/stock-requests/${id}`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function deleteStockRequest(restaurantId: Id, id: Id): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/stock-requests/${id}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function addStockRequestItem(
  restaurantId: Id,
  stockRequestId: Id,
  payload: any
): Promise<StockRequestItemRow> {
  return http<StockRequestItemRow>(`/stock-requests/${stockRequestId}/items`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function updateStockRequestItem(
  restaurantId: Id,
  stockRequestId: Id,
  itemId: Id,
  payload: { quantity?: number; notes?: string | null }
): Promise<StockRequestItemRow> {
  return http<StockRequestItemRow>(`/stock-requests/${stockRequestId}/items/${itemId}`, {
    method: "PUT",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function deleteStockRequestItem(
  restaurantId: Id,
  stockRequestId: Id,
  itemId: Id
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/stock-requests/${stockRequestId}/items/${itemId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function fulfillStockRequest(
  restaurantId: Id,
  stockRequestId: Id,
  payload: {
    complete?: boolean;
    fulfilledAt?: string;
    items?: Array<{ id: Id; fulfilledQty: number | null }>;
  }
): Promise<StockRequestRow> {
  return http<StockRequestRow>(`/stock-requests/${stockRequestId}/fulfill`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function listPurchaseRuns(restaurantId: Id): Promise<PurchaseRunRow[]> {
  return http<PurchaseRunRow[]>("/purchase-runs", {
    restaurantId,
    qs: { restaurantId },
  });
}

export function createPurchaseRun(
  restaurantId: Id,
  payload: {
    title?: string | null;
    runAt?: string;
    notes?: string | null;
    createdBy?: string | null;
  }
): Promise<PurchaseRunRow> {
  return http<PurchaseRunRow>("/purchase-runs", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function getPurchaseRun(restaurantId: Id, id: Id): Promise<PurchaseRunDetail> {
  return http<PurchaseRunDetail>(`/purchase-runs/${id}`, {
    restaurantId,
    qs: { restaurantId },
  });
}

export function closePurchaseRun(
  restaurantId: Id,
  id: Id,
  payload?: { closedBy?: string | null }
): Promise<any> {
  return http<any>(`/purchase-runs/${id}/close`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function reopenPurchaseRun(
  restaurantId: Id,
  id: Id
): Promise<any> {
  return http<any>(`/purchase-runs/${id}/reopen`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
  });
}

export function cancelPurchaseRun(
  restaurantId: Id,
  id: Id
): Promise<any> {
  return http<any>(`/purchase-runs/${id}/cancel`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
  });
}

/** ===== Conteos físicos ===== */
export function listStockCounts(restaurantId: Id): Promise<StockCountRow[]> {
  return http<StockCountRow[]>("/stock-counts", { restaurantId, qs: { restaurantId } });
}

export function createStockCount(
  restaurantId: Id,
  payload: {
    warehouseId: Id;
    startedAt?: string;
    notes?: string;
    createdBy?: string;
    countedBy?: string;
  }
): Promise<StockCountRow> {
  return http<StockCountRow>("/stock-counts", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function getStockCount(restaurantId: Id, countId: Id): Promise<StockCountDetail> {
  return http<StockCountDetail>(`/stock-counts/${countId}`, {
    restaurantId,
    qs: { restaurantId },
  });
}

export function closeStockCount(
  restaurantId: Id,
  countId: Id,
  payload?: { closedBy?: string }
): Promise<any> {
  return http<any>(`/stock-counts/${countId}/close`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload ?? {},
  });
}

export function deleteStockCount(restaurantId: Id, countId: Id): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/stock-counts/${countId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function calcInventoryCut(
  restaurantId: Id,
  payload: InventoryCutRequest
): Promise<InventoryCutResponse> {
  return http<InventoryCutResponse>("/inventory/cuts/calc", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function createInventoryCut(
  restaurantId: Id,
  payload: InventoryCutRequest
): Promise<InventoryCutCreateResponse> {
  return http<InventoryCutCreateResponse>("/inventory/cuts", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function listInventoryCuts(
  restaurantId: Id,
  opts: { warehouseId?: Id | null } = {}
): Promise<InventoryCutSummaryRow[]> {
  return http<InventoryCutSummaryRow[]>("/inventory/cuts", {
    restaurantId,
    qs: { restaurantId, warehouseId: opts.warehouseId },
  });
}

export function addStockCountItem(
  restaurantId: Id,
  countId: Id,
  payload: {
    inventoryItemId: Id;
    presentationId?: Id | null;
    countedQtyBase: number;
    notes?: string;
  }
): Promise<StockCountItemRow> {
  return http<StockCountItemRow>(`/stock-counts/${countId}/items`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

// ✅ tu backend usa PATCH /stock-counts/:id/items/:itemId
export function updateStockCountItem(
  restaurantId: Id,
  countId: Id,
  itemId: Id,
  payload: { countedQtyBase?: number; presentationId?: Id | null; notes?: string }
): Promise<StockCountItemRow> {
  return http<StockCountItemRow>(`/stock-counts/${countId}/items/${itemId}`, {
    method: "PATCH",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function deleteStockCountItem(
  restaurantId: Id,
  countId: Id,
  itemId: Id
): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/stock-counts/${countId}/items/${itemId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

/** ===== BOM (ajusta rutas si tu router difiere) ===== */
export function listExternalRefs(restaurantId: Id): Promise<ExternalRefRow[]> {
  return http<ExternalRefRow[]>("/inventory/external-refs", { restaurantId, qs: { restaurantId } });
}
export function listPrintAreaWarehouseMaps(restaurantId: Id): Promise<PrintAreaWarehouseMapRow[]> {
  return http<PrintAreaWarehouseMapRow[]>("/inventory/print-area-warehouse-maps", {
    restaurantId,
    qs: { restaurantId },
  });
}
export function upsertPrintAreaWarehouseMap(
  restaurantId: Id,
  payload: Partial<PrintAreaWarehouseMapRow> &
    Pick<PrintAreaWarehouseMapRow, "printAreaId" | "warehouseId">
): Promise<PrintAreaWarehouseMapRow> {
  if (payload.id) {
    return http<PrintAreaWarehouseMapRow>(`/inventory/print-area-warehouse-maps/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<PrintAreaWarehouseMapRow>("/inventory/print-area-warehouse-maps", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}
export function listRecipes(
  restaurantId: Id,
  opts: { q?: string; posProductId?: Id } = {}
): Promise<InventoryRecipeRow[]> {
  return http<InventoryRecipeRow[]>("/inventory/recipes", {
    restaurantId,
    qs: { restaurantId, ...opts },
  });
}
export function upsertRecipe(
  restaurantId: Id,
  payload: Partial<InventoryRecipeRow> &
    Pick<InventoryRecipeRow, "name"> & { posProductId?: Id | null; posProductCode?: string | null }
): Promise<InventoryRecipeRow> {
  if (payload.id) {
    return http<InventoryRecipeRow>(`/inventory/recipes/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<InventoryRecipeRow>("/inventory/recipes", {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}

export function deleteRecipe(restaurantId: Id, id: Id): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/inventory/recipes/${id}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}
export function listRecipeLines(restaurantId: Id, recipeId: Id): Promise<InventoryRecipeLineRow[]> {
  return http<InventoryRecipeLineRow[]>(`/inventory/recipes/${recipeId}/lines`, {
    restaurantId,
    qs: { restaurantId },
  });
}
export function upsertRecipeLine(
  restaurantId: Id,
  recipeId: Id,
  payload: Partial<InventoryRecipeLineRow> &
    Pick<InventoryRecipeLineRow, "qtyBase"> & {
      inventoryItemId?: Id | null;
      subRecipeId?: Id | null;
      presentationId?: Id | null;
    }
): Promise<InventoryRecipeLineRow> {
  if (payload.id) {
    return http<InventoryRecipeLineRow>(`/inventory/recipe-lines/${payload.id}`, {
      method: "PUT",
      restaurantId,
      qs: { restaurantId },
      body: payload,
    });
  }
  return http<InventoryRecipeLineRow>(`/inventory/recipes/${recipeId}/lines`, {
    method: "POST",
    restaurantId,
    qs: { restaurantId },
    body: payload,
  });
}
export function deleteRecipeLine(
  restaurantId: Id,
  recipeId: Id,
  lineId: Id
): Promise<any> {
  return http<any>(`/inventory/recipes/${recipeId}/lines/${lineId}`, {
    method: "DELETE",
    restaurantId,
    qs: { restaurantId },
  });
}

export function searchPosProducts(
  restaurantId: Id,
  q: string,
  limit = 20
): Promise<PosProductRow[]> {
  return http<PosProductRow[]>("/pos-products", {
    restaurantId,
    qs: { restaurantId, q, limit },
  });
}

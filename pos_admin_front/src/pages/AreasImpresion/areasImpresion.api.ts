import apiOrder from "@/components/apis/apiOrder";

export interface AreaImpresion {
  id: number;
  name: string;
}

export interface AreaUpsert {
  name: string;
}
export async function listAreas(): Promise<AreaImpresion[]> {
  const res = await apiOrder.get("/areasImpresion");
  // Soporta payload plano o paginado { data: [...] }
  const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  return data as AreaImpresion[];
}

export async function createArea(payload: AreaUpsert): Promise<AreaImpresion> {
  const { data } = await apiOrder.post("/areasImpresion", payload);
  return data as AreaImpresion;
}

export async function updateArea(
  id: number,
  payload: AreaUpsert
): Promise<AreaImpresion> {
  const { data } = await apiOrder.put(`/areasImpresion/${id}`, payload);
  return data as AreaImpresion;
}

export async function removeArea(id: number): Promise<void> {
  await apiOrder.delete(`/areasImpresion/${id}`);
}

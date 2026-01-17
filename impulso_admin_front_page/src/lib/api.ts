const API = import.meta.env.VITE_API_BASE as string;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function listTraspasos(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return http<{ data: any[] }>(`/api/traspasos${qs}`);
}

export function getTraspaso(id: string | number) {
  return http<{ data: any }>(`/api/traspasos/${id}`);
}

export async function createTraspaso(payload: any) {
  return http<{ ok: true; id: number; slug: string }>(`/api/traspasos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listPhotos(id: string | number) {
  return http<{
    ok: true;
    photos: { id: number; url: string; sortOrder?: number }[];
  }>(`/api/traspasos/${id}/photos`);
}

export async function reorderPhotos(id: string | number, ids: number[]) {
  return http<{ ok: true }>(`/api/traspasos/${id}/photos/order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function deletePhoto(traspasoId: number, photoId: number) {
  return http<{ ok: true }>(`/api/traspasos/${traspasoId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

export function updateTraspaso(
  id: number,
  payload: any,
  opts?: { regenSlug?: boolean }
) {
  const qs = opts?.regenSlug ? "?regenSlug=true" : "";
  return http<{ ok: true; id: number; slug: string }>(
    `/api/traspasos/${id}${qs}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function deleteTraspaso(id: number) {
  return http<{ ok: true }>(`/api/traspasos/${id}`, { method: "DELETE" });
}

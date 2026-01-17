const API = import.meta.env.VITE_API_BASE as string;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** GET /api/cvs?q=&status=&tag= */
export function listCVs(params?: {
  q?: string;
  status?: string;
  tag?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.tag) qs.set("tag", params.tag);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http<{ data: any[] }>(`/api/cvs${suffix}`);
}

/** GET /api/cvs/:id */
export function getCV(id: string | number) {
  return http<{ data: any }>(`/api/cvs/${id}`);
}

/** POST /api/cvs */
export function createCV(payload: any) {
  return http<{ ok: true; id: number }>(`/api/cvs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/cvs/:id */
export function updateCV(id: number, payload: any) {
  return http<{ ok: true }>(`/api/cvs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** GET /api/cvs/:id/files */
export function listCVFiles(id: number | string) {
  return http<{
    ok: true;
    files: { id: number; url: string; name: string; size?: number }[];
  }>(`/api/cvs/${id}/files`);
}

/** DELETE /api/cvs/:id/files/:fileId */
export function deleteCVFile(id: number, fileId: number) {
  return http<{ ok: true }>(`/api/cvs/${id}/files/${fileId}`, {
    method: "DELETE",
  });
}

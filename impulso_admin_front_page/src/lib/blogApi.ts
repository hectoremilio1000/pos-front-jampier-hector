const API = import.meta.env.VITE_API_BLOG__BASE as string; // p.ej. https://TU-API.com

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Lista (pública) para reutilizar
export function listBlogPosts(limit = 100, page = 1, mode = "all") {
  return http(`/api/blog-posts?limit=${limit}&page=${page}&mode=${mode}`);
}

// Detalle por ID (para edición)
export function getBlogPost(id: number | string) {
  return http<any>(`/api/blog-posts/id/${id}`);
}

// Crear/Actualizar/Eliminar
export function createBlogPost(payload: any) {
  return http<any>(`/api/blog-posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function updateBlogPost(id: number, payload: any) {
  return http<any>(`/api/blog-posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function deleteBlogPost(id: number) {
  return http<{ ok: true }>(`/api/blog-posts/${id}`, { method: "DELETE" });
}

// Uploads (FTPS)
export async function uploadCover(postId: number, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return http<{ ok: true; url: string }>(`/api/blog-posts/${postId}/cover`, {
    method: "POST",
    body: fd,
  });
}
export async function uploadBlockImage(postId: number, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return http<{ ok: true; url: string }>(
    `/api/blog-posts/${postId}/blocks/image`,
    {
      method: "POST",
      body: fd,
    }
  );
}

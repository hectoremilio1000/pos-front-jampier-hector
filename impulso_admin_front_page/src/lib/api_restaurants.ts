// src/lib/api_restaurants.ts
const REST_API = import.meta.env.VITE_API_RESTAURANTS_BASE as string;

async function httpRest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${REST_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type RestaurantRow = {
  id: number;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  isActive: boolean;
};

export function listRestaurants() {
  return httpRest<{
    ok: true;
    restaurants: RestaurantRow[];
  }>("/api/restaurants");
}

export function getRestaurantBySlug(slug: string) {
  return httpRest<{
    ok: true;
    restaurant: {
      id: number;
      name: string;
      slug: string;
      defaultLocale: string;
      websiteUrl?: string | null;
      isActive: boolean;
    };
  }>(`/api/restaurants/${encodeURIComponent(slug)}`);
}

export function updateRestaurant(
  id: number,
  payload: Partial<RestaurantRow> & {
    defaultLocale?: string;
  }
) {
  return httpRest<{ ok: true; restaurant: RestaurantRow }>(
    `/api/restaurants/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

/* =============================
 * Fotos de menú (menú digital)
 * ============================ */

export type MenuPhotoRow = {
  id: number;
  url: string;
  altText?: string | null;
  sortOrder: number;
};

/**
 * Lista las fotos de menú para un restaurante/locale/section
 */
export function listMenuPhotos(slug: string, locale: string, section: string) {
  return httpRest<{
    ok: true;
    photos: MenuPhotoRow[];
  }>(
    `/api/restaurants/${encodeURIComponent(slug)}/menus/${encodeURIComponent(
      locale
    )}/${encodeURIComponent(section)}/photos`
  );
}

/**
 * Reordenar fotos de menú
 */
export function reorderMenuPhotos(
  slug: string,
  locale: string,
  section: string,
  ids: number[]
) {
  return httpRest<{ ok: true }>(
    `/api/restaurants/${encodeURIComponent(slug)}/menus/${encodeURIComponent(
      locale
    )}/${encodeURIComponent(section)}/photos/order`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }
  );
}

/**
 * Eliminar foto de menú
 */
export function deleteMenuPhoto(
  slug: string,
  locale: string,
  section: string,
  photoId: number
) {
  return httpRest<{ ok: true }>(
    `/api/restaurants/${encodeURIComponent(slug)}/menus/${encodeURIComponent(
      locale
    )}/${encodeURIComponent(section)}/photos/${photoId}`,
    {
      method: "DELETE",
    }
  );
}

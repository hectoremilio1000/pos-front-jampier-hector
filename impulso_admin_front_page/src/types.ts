export type TraspasoListItem = {
  id: number;
  title: string;
  slug: string;
  colonia?: string | null;
  alcaldia?: string | null;
  ciudad?: string | null;
  rentaMx?: string | null;
  traspasoMx?: string | null;
  metrosCuadrados?: number | null;
  aforo?: number | null;
  createdAt?: string;
};

export type Photo = { id: number; url: string; sortOrder?: number };

export type Traspaso = {
  id: number;
  title: string;
  slug: string;
  colonia?: string;
  alcaldia?: string;
  ciudad: string;
  rentaMx?: string;
  traspasoMx?: string;
  metrosCuadrados?: number;
  aforo?: number;
  descripcion?: string | null;
  servicios?: unknown;
  contactoNombre?: string | null;
  contactoTel?: string | null;
  contactoWhatsapp?: string | null;
  status: "draft" | "published" | "archived" | string;
  publishedAt?: string | null;
  photos?: Photo[];
};

import { useEffect, useMemo, useState } from "react";
import { Tabs, Typography, Spin } from "antd";
import type { TabsProps } from "antd";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { listRestaurants } from "@/lib/api_restaurants";

export type RestaurantRow = {
  id: number;
  slug: string;
  name: string;
};

export type InventariosOutletContext = {
  restaurant: RestaurantRow;
};

export default function InventariosPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [loading, setLoading] = useState(false);

  const basePath = useMemo(() => `/admin/restaurantes/${slug}/inventario`, [slug]);

  useEffect(() => {
    if (!slug) return;

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const res = await listRestaurants(); // { restaurants: [...] }
        const rows = (res as any)?.restaurants ?? [];
        const r = rows.find((x: any) => x.slug === slug) ?? null;
        if (alive) setRestaurant(r);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  // Determinar tab activo desde la URL
  const activeKey = useMemo(() => {
    const rest = pathname.replace(basePath, "");
    const key = rest.split("/").filter(Boolean)[0] ?? "insumos";
    return key;
  }, [pathname, basePath]);

  const items: TabsProps["items"] = [
    { key: "insumos", label: "Insumos" },
    { key: "presentaciones", label: "Presentaciones" },
    { key: "compras", label: "Compras" },
    { key: "bom", label: "Recetas" },
    { key: "almacenes", label: "Almacenes" },
    { key: "proveedores", label: "Proveedores" },
    { key: "conteos", label: "Conteos físicos" },
    { key: "diferencias", label: "Diferencias" },
  ];

  // Si caes exactamente en /inventario, manda a /inventario/insumos
  useEffect(() => {
    if (pathname === basePath) nav(`${basePath}/insumos`, { replace: true });
  }, [pathname, basePath, nav]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Title level={4}>Restaurante no encontrado</Typography.Title>
        <Typography.Text type="secondary">
          Revisa que el slug <b>{slug}</b> exista en tu base local.
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Inventario – {restaurant.name}
      </Typography.Title>

      <Tabs activeKey={activeKey} items={items} onChange={(key) => nav(`${basePath}/${key}`)} />

      <Outlet context={{ restaurant }} />
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { Tabs, Typography, Spin } from "antd";
import type { TabsProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/Auth/AuthContext";

export type RestaurantRow = {
  id: number;
  name: string;
};

export type InventariosOutletContext = {
  restaurant: RestaurantRow;
};

export default function InventariosPage() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();

  const restaurant = useMemo<RestaurantRow | null>(() => {
    const id = Number((user as any)?.restaurant?.id ?? user?.restaurantId ?? 0);
    if (!id) return null;
    const name =
      (user as any)?.restaurant?.name ??
      (user as any)?.restaurant?.businessName ??
      "Restaurante";
    return { id, name };
  }, [user]);

  const basePath = "/inventario";

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
    { key: "mermas", label: "Mermas" },
    { key: "movimientos", label: "Movimientos" },
    { key: "consumo", label: "Ventas (Consumo)" },
    { key: "diferencias", label: "Inventario final" },
  ];

  // Si caes exactamente en /inventario, manda a /inventario/insumos
  useEffect(() => {
    if (pathname === basePath) nav(`${basePath}/insumos`, { replace: true });
  }, [pathname, basePath, nav]);

  if (authLoading) {
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
          No se encontró el restaurante en la sesión actual.
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Inventario – {restaurant.name}
      </Typography.Title>

      <Tabs
        activeKey={activeKey}
        items={items}
        onChange={(key) => nav(`${basePath}/${key}`)}
      />

      <Outlet context={{ restaurant }} />
    </div>
  );
}

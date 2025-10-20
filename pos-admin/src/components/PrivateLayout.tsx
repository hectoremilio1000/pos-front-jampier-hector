import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Button, Drawer, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "./Auth/AuthContext";

import { MenuOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

type Item = { to: string; label: string; icon?: React.ReactNode };
type Section =
  | { kind: "header"; label: string; items: Item[] }
  | { kind: "single"; label: string; to: string; icon?: React.ReactNode };

const SECTIONS: Section[] = [
  {
    kind: "header",
    label: "🚀 INICIO",
    items: [
      { to: "/dashboard", label: "🏠 Dashboard" },
      { to: "/reportes", label: "📊 Reportes" },
    ],
  },
  {
    kind: "single",
    label: "Punto de venta",
    to: "/control",
    icon: <>🛒</>, // icono para cuando el sidebar está colapsado
  },

  {
    kind: "header",
    label: "📘 ADMINISTRACIÓN",
    items: [
      // { to: "/stations", label: "💵 Cajas" },
      { to: "/usuarios", label: "👥 Usuarios" },
      { to: "/facturas", label: "🧾 Facturas (CFDI)" },
      { to: "/metodos-pago", label: "💳 Métodos de pago y Propinas" },
      { to: "/hour_cut", label: "⏰ Parámetros fiscales" },
      { to: "/admin/cuentas", label: "💵 Cuentas (histórico / auditoría)" },
    ],
  },
  {
    kind: "header",
    label: "📦 CATÁLOGO",
    items: [
      { to: "/productos/categorias", label: "🗂️ Categorías" },
      { to: "/productos/grupos", label: "📑 Grupos" },
      { to: "/productos", label: "🍩 Productos" },
      { to: "/productos/subgrupos", label: "🧩 Subgrupos" },
      { to: "/productos/modificadores", label: "🎛️ Modificadores" },
      { to: "/mesas", label: "🍽️ Área de mesas" },
    ],
  },
  {
    kind: "header",
    label: "🛠️ INFRAESTRUCTURA",
    items: [
      // { to: "/infra", label: "✅ Checklist" },
      { to: "/stations", label: "🧾 Caja" },
      { to: "/productionMonitors", label: "🖥️ Monitores de producción" },
      { to: "/generatePairing", label: "🔗 Tabletas y Commanderos" },
      { to: "/areasImpresion", label: "🖨️ Áreas de impresión" },
    ],
  },
];

function SidebarLink({
  to,
  label,
  icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return collapsed ? (
    <Tooltip title={label} placement="right">
      <NavLink
        to={to}
        end
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center justify-center w-full h-11 rounded transition ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-blue-100"
          }`
        }
      >
        <span className="text-xl">{icon}</span>
      </NavLink>
    </Tooltip>
  ) : (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 rounded transition ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-700 hover:bg-blue-100"
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

export default function PrivateLayout() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // estado de expansión por sección header

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // auto-abrir la sección que contiene la ruta actual
  // auto-abrir la sección que contiene la ruta actual; si no, abrir INICIO
  useEffect(() => {
    // índice del header que contiene la ruta actual
    const foundHeaderIdx = SECTIONS.findIndex(
      (s) =>
        s.kind === "header" &&
        s.items.some((it) => location.pathname.startsWith(it.to))
    );

    // índice del primer header (INICIO) como fallback
    const firstHeaderIdx = SECTIONS.findIndex((s) => s.kind === "header");
    const openIdx = foundHeaderIdx >= 0 ? foundHeaderIdx : firstHeaderIdx;

    // construir el mapa: solo ese header en true
    const next: Record<string, boolean> = {};
    let headerOrdinal = -1;
    SECTIONS.forEach((s, i) => {
      if (s.kind === "header") {
        headerOrdinal += 1;
        next[`sec-${i}`] = headerOrdinal === openIdx;
      }
    });
    setOpenMap(next);
  }, [location.pathname]);

  const toggle = (k: string) => setOpenMap((m) => ({ ...m, [k]: !m[k] }));

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-1 p-2">
        {SECTIONS.map((sec, i) => {
          if (sec.kind === "single") {
            return (
              <div key={`single-${i}`} className="mt-2">
                <SidebarLink
                  to={sec.to}
                  label={sec.label} // ← ya no quitamos el emoji
                  icon={sec.icon} // ← usa el icono que definiste
                  collapsed={collapsed}
                  onClick={() => setDrawerOpen(false)}
                />
              </div>
            );
          }

          // headers colapsables
          const key = `sec-${i}`;
          const isOpen = openMap[key] ?? false;

          return (
            <div key={key} className="mt-2">
              <button
                onClick={() => toggle(key)}
                className={`w-full flex items-center px-4 py-1 ${
                  collapsed ? "justify-center" : "justify-between"
                } text-xs uppercase tracking-wider text-gray-500 hover:text-gray-700`}
              >
                {!collapsed ? (
                  <>
                    <span>{sec.label}</span>
                    <span
                      className={`transition ${isOpen ? "rotate-0" : "rotate-180"}`}
                    >
                      ▾
                    </span>
                  </>
                ) : (
                  <Tooltip title={sec.label} placement="right">
                    <span>▤</span>
                  </Tooltip>
                )}
              </button>

              {/* contenido del header */}
              {isOpen && (
                <div className="flex flex-col gap-1 mt-1">
                  {sec.items.map((it) => (
                    <SidebarLink
                      key={it.to}
                      to={it.to}
                      label={it.label}
                      icon={it.icon}
                      collapsed={collapsed}
                      onClick={() => setDrawerOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* colapsar sidebar en desktop */}
      <div className="hidden md:flex justify-center p-2 border-t">
        <Button
          size="small"
          onClick={() => setCollapsed(!collapsed)}
          icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden text-white text-xl"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuOutlined />
          </button>
          <h1 className="font-bold">
            <span className="text-white text-2xl sm:text-3xl">GrowthSuite</span>
            <span className="text-yellow-500 text-2xl sm:text-3xl">
              {" "}
              POS Admin
            </span>
          </h1>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          <span className="font-semibold">{user?.restaurant?.name}</span>

          <span className="font-semibold">👨‍🍳 {user?.fullName}</span>
          <Button onClick={logout} className="bg-red-500 text-white">
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="flex flex-grow min-h-0">
        <aside
          className={`hidden md:flex flex-col bg-gray-100 border-r transition-all duration-200 ${collapsed ? "w-20" : "w-64"}`}
        >
          <SidebarContent />
        </aside>

        <Drawer
          title="Menú"
          placement="left"
          closable
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          bodyStyle={{ padding: 0 }}
        >
          <SidebarContent />
        </Drawer>

        <main className="flex-grow p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

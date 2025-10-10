import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Button, Drawer, Avatar, Tooltip } from "antd";
import {
  MenuOutlined,
  UserOutlined,
  AppstoreOutlined,
  ShopOutlined,
  TableOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useAuth } from "./Auth/AuthContext";
import { useEffect, useState, type JSX } from "react";
import {
  FaBox,
  FaBoxTissue,
  FaPaperPlane,
  FaPlus,
  FaPrint,
  FaRulerCombined,
  FaUser,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";
import { FiSettings } from "react-icons/fi";
import { MdAssessment } from "react-icons/md";
import { FaFileLines } from "react-icons/fa6";

/** =========================
 *  ESQUEMA DEL MENÚ (inline)
 *  ========================= */

type LinkItem = {
  type: "link";
  to: string;
  label: string;
  icon?: string;
};

type GroupItem = {
  type: "group";
  key: string; // clave única para estado (apertura/cierre)
  label: string;
  icon?: string;
  defaultOpen?: boolean;
  children: LinkItem[];
};

type MenuItem = LinkItem | GroupItem;

// Mapa de íconos por nombre (para que el esquema sea declarativo)
const ICONS: Record<string, JSX.Element> = {
  // genéricos
  settings: <FiSettings />,
  reports: <MdAssessment />,
  account: <FaUser />,
  invoices: <FaPaperPlane />,
  list: <FaFileLines />,
  customers: <UserOutlined />,
  user: <UserOutlined />,
  box: <FaBox />,
  file: <FaFileLines />,
  app: <AppstoreOutlined />,
  print: <FaPrint />,
  shop: <ShopOutlined />,
  table: <TableOutlined />,
  // productos
  plus: <FaPlus />,
  meal: <GiHotMeal />,
  box_tissue: <FaBoxTissue />,
  ruler: <FaRulerCombined />,
};

function getIcon(name?: string) {
  if (!name) return null;
  return ICONS[name] ?? null;
}

// Menú data-driven (puedes editar/ordenar aquí)
const MENU_SCHEMA: MenuItem[] = [
  {
    type: "link",
    to: "/configuracion",
    label: "Configuración",
    icon: "settings",
  },
  { type: "link", to: "/reportes", label: "Reportes", icon: "reports" },
  { type: "link", to: "/account", label: "Mi Cuenta", icon: "account" },

  {
    type: "group",
    key: "invoices",
    label: "Facturas",
    icon: "invoices",
    defaultOpen: true,
    children: [
      { type: "link", to: "/invoices", label: "Lista", icon: "list" },
      {
        type: "link",
        to: "/invoices/customers",
        label: "Clientes",
        icon: "customers",
      },
    ],
  },

  { type: "link", to: "/usuarios", label: "Usuarios", icon: "user" },
  { type: "link", to: "/stations", label: "Estaciones/Cajas", icon: "box" },
  {
    type: "link",
    to: "/hour_cut",
    label: "Horario Turnos/Z corte",
    icon: "file",
  },
  { type: "link", to: "/areas", label: "Áreas", icon: "app" },
  {
    type: "link",
    to: "/areasImpresion",
    label: "Áreas Impresión",
    icon: "print",
  },
  { type: "link", to: "/generatePairing", label: "KDS Pairing", icon: "print" },
  {
    type: "link",
    to: "/productionMonitors",
    label: "Monitores de producción",
    icon: "print",
  },

  {
    type: "group",
    key: "productos",
    label: "Productos",
    icon: "shop",
    defaultOpen: true,
    children: [
      {
        type: "link",
        to: "/productos",
        label: "Agregar producto",
        icon: "plus",
      },
      {
        type: "link",
        to: "/productos/categorias",
        label: "Categorías",
        icon: "meal",
      },
      {
        type: "link",
        to: "/productos/grupos",
        label: "Grupos de productos",
        icon: "box_tissue",
      },
      {
        type: "link",
        to: "/productos/subgrupos",
        label: "SubGrupos de productos",
        icon: "box_tissue",
      },
      {
        type: "link",
        to: "/productos/modificadores",
        label: "Modificadores",
        icon: "ruler",
      },
    ],
  },

  { type: "link", to: "/mesas", label: "Mesas", icon: "table" },
];

/** =========================
 *  Persistencia UI (localStorage)
 *  ========================= */
const OPEN_STATE_STORAGE_KEY = "sidebar.openState.v1";
const COLLAPSED_STORAGE_KEY = "sidebar.collapsed.v1";

function loadOpenStateFromStorage(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveOpenStateToStorage(state: Record<string, boolean>) {
  localStorage.setItem(OPEN_STATE_STORAGE_KEY, JSON.stringify(state));
}
function loadCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : false;
  } catch {
    return false;
  }
}
function saveCollapsed(val: boolean) {
  localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(val));
}

/** =========================
 *  Componente
 *  ========================= */
const PrivateLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed());

  // estado de apertura por grupo
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const persisted = loadOpenStateFromStorage();
    const initial: Record<string, boolean> = { ...persisted };
    MENU_SCHEMA.forEach((it) => {
      if (it.type === "group" && initial[it.key] === undefined) {
        initial[it.key] = !!it.defaultOpen;
      }
    });
    return initial;
  });

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    saveOpenStateToStorage(openGroups);
  }, [openGroups]);

  // ¿algún hijo del grupo está activo?
  const groupIsActive = (group: GroupItem) =>
    group.children.some((c) => location.pathname.startsWith(c.to));

  const CollapsedLink: React.FC<{ item: LinkItem }> = ({ item }) => (
    <Tooltip title={item.label} placement="right">
      <NavLink
        to={item.to}
        onClick={() => setDrawerOpen(false)}
        className={({ isActive }) =>
          `flex items-center justify-center w-full h-12 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-blue-100"
          }`
        }
      >
        <span className="text-xl">{getIcon(item.icon)}</span>
      </NavLink>
    </Tooltip>
  );

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-1 p-2">
        {MENU_SCHEMA.map((item, idx) => {
          if (item.type === "link") {
            if (collapsed) {
              return <CollapsedLink key={`${item.to}-${idx}`} item={item} />;
            }
            return (
              <NavLink
                key={`${item.to}-${idx}`}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded transition-all ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-blue-100"
                  }`
                }
              >
                <span className="text-xl">{getIcon(item.icon)}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          }

          const isOpen = !!openGroups[item.key];
          const active = groupIsActive(item);

          if (collapsed) {
            return (
              <Tooltip key={item.key} title={item.label} placement="right">
                <button
                  onClick={() =>
                    setOpenGroups((s) => ({ ...s, [item.key]: !s[item.key] }))
                  }
                  className={`flex items-center justify-center w-full h-12 rounded ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  <span className="text-xl">{getIcon(item.icon)}</span>
                </button>
              </Tooltip>
            );
          }

          return (
            <div key={item.key}>
              <button
                onClick={() =>
                  setOpenGroups((s) => ({ ...s, [item.key]: !s[item.key] }))
                }
                className={`flex items-center w-full gap-3 px-4 py-2 rounded transition-all ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-blue-100"
                }`}
              >
                <span className="text-xl">{getIcon(item.icon)}</span>
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto">
                  {isOpen ? <UpOutlined /> : <DownOutlined />}
                </span>
              </button>

              {isOpen && (
                <div className="ml-4 mt-1 flex flex-col gap-1 text-sm">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <span className="text-base">{getIcon(child.icon)}</span>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Colapsar sidebar en desktop */}
      <div className="hidden md:flex justify-center p-2 border-t">
        <Button
          size="small"
          onClick={() => setCollapsed((v) => !v)}
          icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Drawer en móvil */}
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

        {/* Info usuario solo en desktop */}
        <div className="hidden md:flex gap-4 items-center">
          <span className="font-semibold">{user?.restaurant?.name}</span>
          <span className="font-semibold">👨‍🍳 {user?.fullName}</span>
          <Button onClick={logout} className="bg-red-500 text-white">
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Layout principal */}
      <div className="flex flex-grow min-h-0">
        {/* Sidebar en desktop */}
        <aside
          className={`hidden md:flex flex-col bg-gray-100 border-r transition-all duration-200 ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Usuario (solo móvil; oculto aquí por ahora) */}
          <div className="md:hidden p-4 border-b flex flex-col items-center text-center gap-1">
            <Avatar size={64}>
              {user?.fullName?.charAt(0).toUpperCase() || "👤"}
            </Avatar>
            <div className="font-semibold">{user?.fullName}</div>
            <div className="text-sm text-gray-600">{user?.role?.code}</div>
            <div className="text-sm text-gray-500">
              {user?.restaurant?.name}
            </div>
          </div>
          <SidebarContent />
        </aside>

        {/* Drawer en móvil */}
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

        {/* Contenido principal */}
        <main className="flex-grow p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PrivateLayout;

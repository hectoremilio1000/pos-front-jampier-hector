import { Outlet, NavLink } from "react-router-dom";
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
import { useState } from "react";
import {
  FaBox,
  FaBoxTissue,
  FaPlus,
  FaPrint,
  FaRulerCombined,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";
import { FiSettings } from "react-icons/fi";
import { MdAssessment } from "react-icons/md";
import { FaFileLines } from "react-icons/fa6";

const navItems = [
  // { to: "/dashboard", label: "Dashboard", icon: <FaPiedPiper /> },
  { to: "/configuracion", label: "Configuracion", icon: <FiSettings /> },
  { to: "/reportes", label: "Reportes", icon: <MdAssessment /> },
  { to: "/usuarios", label: "Usuarios", icon: <UserOutlined /> },
  { to: "/stations", label: "Estaciones/Cajas", icon: <FaBox /> },
  { to: "/hour_cut", label: "Horario Turnos/Z corte", icon: <FaFileLines /> },
  { to: "/areas", label: "Áreas", icon: <AppstoreOutlined /> },
  { to: "/areasImpresion", label: "Áreas Impresion", icon: <FaPrint /> },
  { to: "/generatePairing", label: "KDS Pairing", icon: <FaPrint /> },
  {
    to: "/productionMonitors",
    label: "Monitores de produccion",
    icon: <FaPrint />,
  },
  { to: "/productos", label: "Productos", icon: <ShopOutlined /> }, // tendrá submenú
  { to: "/mesas", label: "Mesas", icon: <TableOutlined /> },
];

const PrivateLayout = () => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [productosOpen, setProductosOpen] = useState(true); // submenú expandido por defecto

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          if (item.label === "Productos") {
            // Menú expandible para "Productos"
            return (
              <div key={item.label}>
                <button
                  onClick={() => setProductosOpen(!productosOpen)}
                  className={`flex items-center w-full gap-3 px-4 py-2 rounded transition-all ${
                    location.pathname.startsWith("/productos")
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-auto">
                        {productosOpen ? <UpOutlined /> : <DownOutlined />}
                      </span>
                    </>
                  )}
                </button>

                {/* Submenú */}
                {!collapsed && productosOpen && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 text-sm">
                    <NavLink
                      to="/productos"
                      end
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <FaPlus /> Agregar producto
                    </NavLink>
                    <NavLink
                      to="/productos/categorias"
                      end
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <GiHotMeal /> Categorias
                    </NavLink>

                    <NavLink
                      to="/productos/grupos"
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <FaBoxTissue /> Grupos de productos
                    </NavLink>
                    <NavLink
                      to="/productos/subgrupos"
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <FaBoxTissue /> SubGrupos de productos
                    </NavLink>
                    <NavLink
                      to="/productos/modificadores"
                      className={({ isActive }) =>
                        `rounded flex gap-2 items-center px-2 py-1 ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <FaRulerCombined /> Modificadores
                    </NavLink>
                  </div>
                )}
              </div>
            );
          }

          // Renderiza los demás items como antes
          const isCollapsed = collapsed;

          if (isCollapsed) {
            return (
              <Tooltip key={item.to} title={item.label} placement="right">
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
                  <span className="text-xl">{item.icon}</span>
                </NavLink>
              </Tooltip>
            );
          }

          return (
            <NavLink
              key={item.to}
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
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Colapsar sidebar en desktop */}
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
          {/* Usuario (solo en móvil) */}
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
          closable={true}
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

import { Outlet, NavLink } from "react-router-dom";
import { Button, Drawer, Avatar, Tooltip } from "antd";
import { MenuOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useAuth } from "./Auth/AuthContext";
import { useState } from "react";
import { FaBox, FaPiedPiper } from "react-icons/fa";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: <FaPiedPiper /> },
  { to: "/turnos", label: "Turnos", icon: <FaBox /> },
  { to: "/ordenes", label: "Ordenes", icon: <FaBox /> },
];

const PrivateLayout = () => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
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
              POS Cash
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

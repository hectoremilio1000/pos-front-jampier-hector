import { useState, useMemo, useCallback } from "react";
import {
  Layout,
  Menu,
  Button,
  Typography,
  Badge,
  theme,
  type MenuProps,
} from "antd";
import {
  DashboardOutlined,
  ShopOutlined,
  UserOutlined,
  ToolOutlined,
  DollarOutlined,
  WarningOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth/AuthContext";

const { Header, Sider, Content } = Layout;

export default function PrivateLayout() {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // resalta item activo
  const selectedKeys: string[] = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/restaurants")) return ["/restaurants"];
    if (p.startsWith("/users")) return ["/users"];
    if (p.startsWith("/plans")) return ["/plans"];
    if (p.startsWith("/subscriptions")) return ["/subscriptions"];
    if (p.startsWith("/invoices")) return ["/invoices"];
    return ["/dashboard"];
  }, [location.pathname]);

  // menú principal (sin <Link>, navegamos con onClick)
  const items: MenuProps["items"] = useMemo(
    () => [
      { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
      {
        type: "group",
        label: "Clientes",
        children: [
          {
            key: "/restaurants",
            icon: <ShopOutlined />,
            label: "Restaurantes",
          },
          { key: "/users", icon: <UserOutlined />, label: "Owners / Usuarios" },
        ],
      },
      {
        type: "group",
        label: "Billing",
        children: [
          {
            key: "/plans",
            icon: <DollarOutlined />,
            label: (
              <span>
                Planes{" "}
                <Badge
                  count="v0"
                  style={{ backgroundColor: token.colorWarning }}
                  offset={[8, -2]}
                />
              </span>
            ),
          },
          {
            key: "/subscriptions",
            icon: <DollarOutlined />,
            label: (
              <span>
                Suscripciones{" "}
                <Badge
                  count="v0"
                  style={{ backgroundColor: token.colorWarning }}
                  offset={[8, -2]}
                />
              </span>
            ),
          },
          {
            key: "/invoices",
            icon: <WarningOutlined />,
            label: (
              <span>
                Facturas{" "}
                <Badge
                  count="v0"
                  style={{ backgroundColor: token.colorWarning }}
                  offset={[8, -2]}
                />
              </span>
            ),
          },
        ],
      },
      {
        type: "group",
        label: "Sistema",
        children: [
          { key: "/settings", icon: <ToolOutlined />, label: "Configuración" },
        ],
      },
    ],
    [token.colorWarning] // solo cambia cuando cambia el tema
  );

  const onMenuClick = useCallback(
    ({ key }: { key: string | number }) => {
      navigate(String(key));
    },
    [navigate]
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsedWidth={80}
        width={260}
        style={{ background: token.colorBgContainer }}
      >
        <div
          className="px-4 py-3"
          style={{
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Typography.Text strong style={{ fontSize: 16 }}>
            <span style={{ color: token.colorPrimary }}>GrowthSuite</span> POS
            Centro
          </Typography.Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={items}
          style={{ borderInlineEnd: 0, padding: "8px 0" }}
          onClick={onMenuClick}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgElevated,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 16,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Centro de Control —{" "}
              <span style={{ color: token.colorPrimary }}>Super Admin</span>
            </Typography.Title>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && (
              <Typography.Text type="secondary">
                👤 {user.fullName} · <strong>{user.role?.code}</strong>
              </Typography.Text>
            )}
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </Header>

        <Content style={{ padding: 16, background: token.colorBgLayout }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: 12 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

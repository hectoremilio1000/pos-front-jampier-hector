import { useState, useMemo } from "react";
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
import { useAuth } from "@/components/Auth/useAuth";

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
    if (p.startsWith("/sa/plans")) return ["/sa/plans"];
    if (p.startsWith("/sa/subscriptions")) return ["/sa/subscriptions"];
    if (p.startsWith("/sa/invoices")) return ["/sa/invoices"];
    if (p.startsWith("/sa/restaurants")) return ["/sa/restaurants"];
    if (p.startsWith("/sa/users")) return ["/sa/users"];
    return ["/dashboard"];
  }, [location.pathname]);

  // menú principal (sin <Link>, navegamos con onClick)
  const items: MenuProps["items"] = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      type: "group",
      label: "Clientes",
      children: [
        {
          key: "/sa/restaurants",
          icon: <ShopOutlined />,
          label: "Restaurantes",
        },
        {
          key: "/sa/users",
          icon: <UserOutlined />,
          label: "Owners / Usuarios",
        },
      ],
    },
    {
      type: "group",
      label: "Billing",
      children: [
        {
          key: "/sa/plans",
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
          key: "/sa/subscriptions",
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
          key: "/sa/invoices",
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
  ];

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
          onClick={({ key }) => navigate(String(key))} // navega por key
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

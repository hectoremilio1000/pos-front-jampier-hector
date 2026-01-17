// /Users/hectoremilio/Proyectos/vite/impulso_administrador/src/App.tsx

import { Layout, Menu, theme } from "antd";
import {
  DatabaseOutlined,
  IdcardOutlined,
  ReadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Link, Route, Routes, useLocation, Navigate } from "react-router-dom";
import TraspasosList from "@/pages/admin/Traspasos/List";
import TraspasoEditor from "@/pages/admin/Traspasos/Editor";
import BlogList from "./pages/admin/Blog/List";
import BlogEditor from "./pages/admin/Blog/Editor";
import CandidatesList from "./pages/admin/Candidates/List";
import CandidateEditor from "./pages/admin/Candidates/Editor";
import RestaurantsList from "@/pages/admin/Restaurantes"; // index.tsx
import MenusPage from "@/pages/admin/Restaurantes/MenusPage";
import InventariosPage from "@/pages/admin/Restaurantes/Inventarios";
import InventoryItemsPage from "@/pages/admin/Restaurantes/Inventarios/Items/ItemsPage";
import InventoryPresentationsPage from "@/pages/admin/Restaurantes/Inventarios/Presentations/PresentationsPage";
import InventoryPurchasesPage from "@/pages/admin/Restaurantes/Inventarios/Purchases";

import InventoryWarehousesPage from "@/pages/admin/Restaurantes/Inventarios/Warehouses/WarehousesPage";
import InventorySuppliersPage from "@/pages/admin/Restaurantes/Inventarios/Suppliers/SuppliersPage";
import InventoryCountsPage from "@/pages/admin/Restaurantes/Inventarios/Counts/CountsPage";
import InventoryDiffsPage from "@/pages/admin/Restaurantes/Inventarios/Diffs/DiffsPage";
import InventoryBOMPage from "@/pages/admin/Restaurantes/Inventarios/BOM/BOMPage";

// import PublicApply from "@/pages/public/Apply";
import PublicPsychometric from "@/pages/public/Psychometric";
import PublicOffer from "@/pages/public/Offer";

// import ApplyCandidate from "@/pages/public/ApplyCandidate";s
import PublicExam from "./pages/public/exams/PublicExam";
import ApplyWizard from "./pages/public/ApplyWizard";

const { Header, Sider, Content } = Layout;

export default function App() {
  const { token } = theme.useToken();
  const { pathname } = useLocation();

  const items = [
    {
      key: "/admin/traspasos",
      icon: <DatabaseOutlined />,
      label: <Link to="/admin/traspasos">Traspasos</Link>,
    },
    {
      key: "/admin/blog",
      icon: <ReadOutlined />,
      label: <Link to="/admin/blog">Blog</Link>,
    }, // ← nuevo
    {
      key: "/admin/candidates",
      icon: <IdcardOutlined />,
      label: <Link to="/admin/candidates">CVs</Link>,
    },
    {
      key: "/admin/restaurantes",
      icon: <ShopOutlined />,
      label: <Link to="/admin/restaurantes">Restaurantes</Link>,
    },
  ];
  const selectedKey = pathname.startsWith("/admin/restaurantes")
    ? "/admin/restaurantes"
    : pathname;
  const isPublic =
    pathname.startsWith("/apply") ||
    pathname.startsWith("/psychometric") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/offer");

  if (isPublic) {
    return (
      <Routes>
        {/* <Route path="/apply" element={<ApplyCandidate />}  */}
        <Route path="/apply/:step" element={<ApplyWizard />} />
        <Route path="/apply" element={<Navigate to="/apply/1" replace />} />

        <Route path="/exam/:type/:token" element={<PublicExam />} />
        <Route path="/psychometric/:token" element={<PublicPsychometric />} />
        <Route path="/offer/:token" element={<PublicOffer />} />
        <Route path="*" element={<Navigate to="/apply" replace />} />
      </Routes>
    );
  }
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={64}>
        <div style={{ color: "white", fontWeight: 700, padding: 16 }}>
          Impulso Admin
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "white",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        />
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/admin/traspasos" replace />}
            />
            {/* Traspasos */}
            <Route path="/admin/traspasos" element={<TraspasosList />} />
            <Route path="/admin/traspasos/:id" element={<TraspasoEditor />} />
            {/* Blog */}
            <Route path="/admin/blog" element={<BlogList />} />
            <Route path="/admin/blog/:id" element={<BlogEditor />} />
            {/* CVs */}

            <Route path="/admin/candidates" element={<CandidatesList />} />
            <Route path="/admin/candidates/:id" element={<CandidateEditor />} />

            <Route path="/admin/restaurantes" element={<RestaurantsList />} />
            <Route
              path="/admin/restaurantes/:slug/menus"
              element={<MenusPage />}
            />

            <Route
              path="/admin/restaurantes/:slug/inventario"
              element={<InventariosPage />}
            >
              <Route index element={<InventoryItemsPage />} />
              <Route path="insumos" element={<InventoryItemsPage />} />
              <Route
                path="presentaciones"
                element={<InventoryPresentationsPage />}
              />
              <Route path="compras/*" element={<InventoryPurchasesPage />} />
              <Route path="almacenes" element={<InventoryWarehousesPage />} />
              <Route path="proveedores" element={<InventorySuppliersPage />} />
              <Route path="conteos" element={<InventoryCountsPage />} />
              <Route path="diferencias" element={<InventoryDiffsPage />} />
              <Route path="bom" element={<InventoryBOMPage />} />
            </Route>

            <Route
              path="*"
              element={<Navigate to="/admin/traspasos" replace />}
            />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

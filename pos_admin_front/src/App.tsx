// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";

import "@ant-design/v5-patch-for-react-19";

import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AuthProvider } from "./components/Auth/AuthContext";
import PrivateLayout from "./components/PrivateLayout";

import FiscalCutSettings from "./pages/FiscalCutSettings";
import ProductionMonitors from "./pages/ProductionMonitors";

import Dashboard from "./pages/Dashboard";
import Categorias from "./pages/Categorias";
import Grupos from "./pages/Grupos";
import ProductosPage from "./pages/Productos";
import AreasImpresionPage from "./pages/AreasImpresion";
import Subgrupos from "./pages/Subgrupos";
import ModificadoresPage from "./pages/Modificadores";
import Mesas from "./pages/Mesas";
import Usuarios from "./pages/Usuarios";
import Areas from "./pages/AreasMesa";
import Dispositivos from "./pages/Dispositivos";
import Services from "./pages/Services";
import Propinas from "./pages/Propinas";

import InvoicesPage from "./pages/Billing/Inovoices";
import CustomersPage from "./pages/Billing/Customers";
import { SubscriptionProvider } from "./components/Billing/SubscriptionContext";
import RequireSubscription from "./components/Billing/RequireSubscription";
import CheckoutSuccess from "./pages/Billing/CheckoutSuccess";
import Account from "./pages/Billing/Account";
import CashStations from "./pages/CashStations";
import ReportsPage from "./pages/Reports";
import FolioSeriesPage from "./pages/FoliosSeries";
import InventariosPage from "./pages/Inventarios";
import InventoryItemsPage from "./pages/Inventarios/Items/ItemsPage";
import InventoryPresentationsPage from "./pages/Inventarios/Presentations/PresentationsPage";
import InventoryPurchasesPage from "./pages/Inventarios/Purchases";
import InventoryWarehousesPage from "./pages/Inventarios/Warehouses/WarehousesPage";
import InventorySuppliersPage from "./pages/Inventarios/Suppliers/SuppliersPage";
import InventoryCountsPage from "./pages/Inventarios/Counts/CountsPage";
import InventoryDiffsPage from "./pages/Inventarios/Diffs/DiffsPage";
import InventoryBOMPage from "./pages/Inventarios/BOM/BOMPage";
import InventoryWastesPage from "./pages/Inventarios/Wastes/WastesPage";
import InventoryMovementsPage from "./pages/Inventarios/Movements/MovementsPage";
import InventoryConsumptionPage from "./pages/Inventarios/Consumption/ConsumptionPage";
import ChoosePlan from "./components/Billing/ChoosePlan";
import ChoosePlanPublic from "./components/Billing/ChoosePlanPublic";
import CheckoutSuccessPublic from "./pages/Billing/CheckoutSuccessPublic";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        {/* este modulo es con authenticacion del usuario por contexto del authprovider cuando inicia session */}
        <Route path="/choose_plan" element={<ChoosePlan />} />
        {/* este modulo sin authenticacion y es necesario el restaurantId*/}
        <Route
          path="/r/:restaurantId/choose_plan"
          element={<ChoosePlanPublic />}
        />

        <Route
          path="/public/checkout/success"
          element={<CheckoutSuccessPublic />}
        />
        <Route
          element={
            <ProtectedRoute>
              <SubscriptionProvider>
                <RequireSubscription>
                  <PrivateLayout />
                </RequireSubscription>
              </SubscriptionProvider>
            </ProtectedRoute>
          }
        >
          {/* 👇 al entrar al layout, redirige a /dashboard */}
          {/* <Route index element={<Navigate to="/dashboard" replace />} /> */}

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cash_stations" element={<CashStations />} />
          <Route path="/hour_cut" element={<FiscalCutSettings />} />
          <Route path="/folio_series" element={<FolioSeriesPage />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/areasImpresion" element={<AreasImpresionPage />} />
          <Route path="/generatePairing" element={<Dispositivos />} />
          <Route path="/facturas" element={<InvoicesPage />} />
          <Route path="/invoices/customers" element={<CustomersPage />} />
          <Route path="/productionMonitors" element={<ProductionMonitors />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/mesas" element={<Mesas />} />
          <Route path="/propinas" element={<Propinas />} />
          <Route path="/services" element={<Services />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/productos/grupos" element={<Grupos />} />
          <Route path="/productos/subgrupos" element={<Subgrupos />} />
          <Route path="/productos/categorias" element={<Categorias />} />
          <Route
            path="/productos/modificadores"
            element={<ModificadoresPage />}
          />
          <Route path="/inventario" element={<InventariosPage />}>
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
            <Route path="mermas" element={<InventoryWastesPage />} />
            <Route path="movimientos" element={<InventoryMovementsPage />} />
            <Route path="consumo" element={<InventoryConsumptionPage />} />
            <Route path="diferencias" element={<InventoryDiffsPage />} />
            <Route path="bom" element={<InventoryBOMPage />} />
          </Route>
          <Route path="/account" element={<Account />} />
          {/* por revisar mas adelante como sera el punto de venta */}
          {/* <Route path="/control" element={<ControlComandero />} /> */}
          {/* Aquí puedes añadir más rutas protegidas */}
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

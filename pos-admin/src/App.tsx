// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import ControlComandero from "./pages/ControlComandero";

import "@ant-design/v5-patch-for-react-19";
import { AuthProvider } from "./components/Auth/AuthContext";
import PrivateLayout from "./components/PrivateLayout";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Mesas from "./pages/Mesas";
import Areas from "./pages/Areas";
import Modificadores from "./pages/Modificadores";
import Grupos from "./pages/Grupos";
import Categorias from "./pages/Categorias";
import SubGrupos from "./pages/SubGrupos";
import ProductosPage from "./pages/ProductosPage";
import AreasImpresion from "./pages/AreasImpresion";
import Stations from "./pages/Stations";
import FiscalCutSettings from "./pages/FiscalCutSettings";
import ProductionMonitors from "./pages/ProductionMonitors";
import { AdminMonitorPairing } from "./pages/AdminPairing";
import InvoicesPage from "./pages/Billing/Inovoices";
import CustomersPage from "./pages/Billing/Customers";
import { SubscriptionProvider } from "./components/Billing/SubscriptionContext";
import RequireSubscription from "./components/Billing/RequireSubscription";
import CheckoutSuccess from "./pages/Billing/CheckoutSuccess";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginScreen />} />

          <Route
            element={
              <SubscriptionProvider>
                <RequireSubscription>
                  <PrivateLayout />
                </RequireSubscription>
              </SubscriptionProvider>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/hour_cut" element={<FiscalCutSettings />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/areasImpresion" element={<AreasImpresion />} />
            <Route path="/generatePairing" element={<AdminMonitorPairing />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/customers" element={<CustomersPage />} />
            <Route
              path="/productionMonitors"
              element={<ProductionMonitors />}
            />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/productos/grupos" element={<Grupos />} />
            <Route path="/productos/subgrupos" element={<SubGrupos />} />
            <Route path="/productos/categorias" element={<Categorias />} />
            <Route
              path="/productos/modificadores"
              element={<Modificadores />}
            />
            <Route path="/control" element={<ControlComandero />} />
            {/* Aquí puedes añadir más rutas protegidas */}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

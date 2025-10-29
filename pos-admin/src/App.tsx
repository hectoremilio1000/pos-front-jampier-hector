// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import ControlComandero from "./pages/ControlComandero";

import "@ant-design/v5-patch-for-react-19";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AuthProvider } from "./components/Auth/AuthContext";
import PrivateLayout from "./components/PrivateLayout";

import FiscalCutSettings from "./pages/FiscalCutSettings";
import ProductionMonitors from "./pages/ProductionMonitors";

import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
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

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />

        <Route
          element={
            <ProtectedRoute>
              <PrivateLayout />
            </ProtectedRoute>
          }
        >
          {/* 👇 al entrar al layout, redirige a /dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/hour_cut" element={<FiscalCutSettings />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/areasImpresion" element={<AreasImpresionPage />} />
          <Route path="/generatePairing" element={<Dispositivos />} />
          <Route path="/productionMonitors" element={<ProductionMonitors />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/mesas" element={<Mesas />} />
          <Route path="/services" element={<Services />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/productos/grupos" element={<Grupos />} />
          <Route path="/productos/subgrupos" element={<Subgrupos />} />
          <Route path="/productos/categorias" element={<Categorias />} />
          <Route
            path="/productos/modificadores"
            element={<ModificadoresPage />}
          />
          <Route path="/control" element={<ControlComandero />} />
          {/* Aquí puedes añadir más rutas protegidas */}
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

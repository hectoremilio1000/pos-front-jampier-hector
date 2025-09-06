// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import ControlComandero from "./pages/ControlComandero";

import "@ant-design/v5-patch-for-react-19";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
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

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginScreen />} />

          <Route
            element={
              <ProtectedRoute>
                <PrivateLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/hour_cut" element={<FiscalCutSettings />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/areasImpresion" element={<AreasImpresion />} />
            <Route path="/generatePairing" element={<AdminMonitorPairing />} />
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
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

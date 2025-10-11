import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "@ant-design/v5-patch-for-react-19";

// Panel (humano)
import LoginScreen from "./pages/LoginScreen";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AuthProvider } from "./components/Auth/AuthContext";
import PrivateLayout from "./components/PrivateLayout";
import Dashboard from "./pages/Dashboard";
import Turnos from "./pages/Turnos";
import Cuentas from "./pages/Cuentas";

// Kiosk Caja (pairing + PIN)
import CashLogin from "./pages/Kiosk/CashLogin";
import CashHome from "./pages/Kiosk/CashHome";
import { KioskProtectedRoute } from "./pages/Kiosk/KioskProtectedRoute";

function App() {
  return (
    <Router>
      {/* Stack Kiosk: no usa ProtectedRoute humano */}
      <Routes>
        <Route path="/kiosk-login" element={<CashLogin />} />
        <Route
          path="/caja"
          element={
            <KioskProtectedRoute>
              <CashHome />
            </KioskProtectedRoute>
          }
        />
      </Routes>

      {/* Stack Panel humano */}
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
            <Route path="/turnos" element={<Turnos />} />
            <Route path="/ordenes" element={<Cuentas />} />
          </Route>

          {/* (Opcional) Si quieres que la raíz vaya a Caja: */}
          <Route path="/" element={<Navigate to="/kiosk-login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

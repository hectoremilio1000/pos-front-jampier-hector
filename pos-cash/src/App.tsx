// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/App.tsx
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
import { KioskProtectedRoute } from "./pages/Kiosk/KioskProtectedRoute";
import CashShell from "./pages/Kiosk/CashShell";

function App() {
  return (
    <Router>
      {/* Stack Kiosk: no usa ProtectedRoute humano */}
      <Routes>
        <Route path="/kiosk-login" element={<LoginScreen />} />
        <Route
          path="/caja"
          element={
            <KioskProtectedRoute>
              <CashShell />
            </KioskProtectedRoute>
          }
        />
      </Routes>

      {/* Stack Panel humano */}
      <AuthProvider>
        <Routes>
          {/* 👇 Alias vacíos para evitar warnings cuando estás en rutas de kiosk */}
          <Route path="/kiosk-login" element={<></>} />
          <Route path="/caja" element={<></>} />

          <Route
            element={
              <ProtectedRoute>
                <PrivateLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/kiosk-login" element={<></>} />
            <Route path="/caja" element={<></>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/turnos" element={<Turnos />} />
            <Route path="/ordenes" element={<Cuentas />} />
          </Route>

          {/* raíz → login kiosk */}
          <Route path="/" element={<Navigate to="/kiosk-login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

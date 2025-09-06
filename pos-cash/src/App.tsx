// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";

import "@ant-design/v5-patch-for-react-19";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AuthProvider } from "./components/Auth/AuthContext";
import PrivateLayout from "./components/PrivateLayout";
import Dashboard from "./pages/Dashboard";

import Turnos from "./pages/Turnos";
import Cuentas from "./pages/Cuentas";

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
            <Route path="/turnos" element={<Turnos />} />
            <Route path="/ordenes" element={<Cuentas />} />

            {/* Aquí puedes añadir más rutas protegidas */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

import { Routes, Route, Navigate } from "react-router-dom";
import "@ant-design/v5-patch-for-react-19";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

import PrivateLayout from "@/components/PrivateLayout";
import LoginScreen from "@/pages/LoginScreen";
import Dashboard from "@/pages/Dashboard";

import Invoices from "@/pages/Invoices/Invoices";
import { AuthProvider } from "./components/Auth/AuthContext";
import Restaurants from "./pages/Restaurants";
import Users from "./pages/Users";
import Plans from "./pages/Plans";
import Subscriptions from "./pages/Suscriptions";
import SaasInvoices from "./pages/SaasInvoices/SaasInvoices";
import NotePrint from "./pages/Notes/NotePrint";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login en "/" */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Zona protegida */}
        <Route
          element={
            <ProtectedRoute>
              <PrivateLayout />
            </ProtectedRoute>
          }
        >
          {/* Al entrar al layout, manda a /dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Rutas del Centro de Control */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/users" element={<Users />} />

          {/* Billing */}
          <Route path="/plans" element={<Plans />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/saas-invoices" element={<SaasInvoices />} />

          {/* (opcional) Sistema */}
          {/* <Route path="/settings" element={<Settings />} /> */}
        </Route>

        <Route
          path="/notes/:id/print"
          element={
            <ProtectedRoute>
              <NotePrint />
            </ProtectedRoute>
          }
        />

        {/* comodín: redirige al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

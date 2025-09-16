// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "@ant-design/v5-patch-for-react-19";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { AuthProvider } from "@/components/Auth/AuthProvider";
import PrivateLayout from "@/components/PrivateLayout";
import LoginScreen from "@/pages/LoginScreen";
import Dashboard from "@/pages/Dashboard";
import Restaurants from "@/pages/sa/Restaurants";
import Users from "@/pages/sa/Users";
import Plans from "@/pages/sa/Plans";
import Subscriptions from "@/pages/sa/Subscriptions";
import Invoices from "@/pages/sa/Invoices";

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
            <Route path="/sa/restaurants" element={<Restaurants />} />
            <Route path="/sa/users" element={<Users />} />

            {/* agrega más rutas protegidas aquí */}
            {/* Centro de control (billing) */}
            <Route path="/sa/plans" element={<Plans />} />
            <Route path="/sa/subscriptions" element={<Subscriptions />} />
            <Route path="/sa/invoices" element={<Invoices />} />
          </Route>
          <Route path="*" element={<LoginScreen />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

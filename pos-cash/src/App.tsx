// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/App.tsx
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import "@ant-design/v5-patch-for-react-19";

import LoginScreen from "./pages/LoginScreen";

// Kiosk Caja (pairing + PIN)
import { KioskProtectedRoute } from "./pages/Kiosk/KioskProtectedRoute";
import CashShell from "./pages/Kiosk/CashShell";

function App() {
  return (
    <BrowserRouter>
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
        <Route path="/" element={<Navigate to="/kiosk-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

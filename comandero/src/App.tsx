import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { KioskAuthProvider } from "@/context/KioskAuthProvider";
import RequireKioskAuth from "@/components/route-guards/RequireKioskAuth";

import LoginScreen from "@/pages/LoginScreen";
import ControlComandero from "./pages/ControlComandero";

export default function App() {
  return (
    <BrowserRouter>
      <KioskAuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to={"/login"} />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/control"
            element={
              <RequireKioskAuth>
                <ControlComandero />
              </RequireKioskAuth>
            }
          />
        </Routes>
      </KioskAuthProvider>
    </BrowserRouter>
  );
}
